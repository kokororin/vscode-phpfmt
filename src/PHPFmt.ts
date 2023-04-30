import {
  workspace as Workspace,
  window as Window,
  type WorkspaceFolder
} from 'vscode';
import path from 'path';
import fs from 'fs';
import os from 'os';
import detectIndent from 'detect-indent';
import findUp from 'find-up';
import phpfmt from 'use-phpfmt';
import type { PHPFmtConfig } from './types';
import type { Widget } from './Widget';
import { Transformation } from './Transformation';
import { PHPFmtError, PHPFmtIgnoreError } from './PHPFmtError';
import { exec } from './utils';

export class PHPFmt {
  private config: PHPFmtConfig;
  private transformation: Transformation;
  private readonly args: string[] = [];

  public constructor(private readonly widget: Widget) {
    this.config = this.getConfig();
    this.transformation = new Transformation(this.config.php_bin);
    this.loadSettings();
  }

  private getConfig(): PHPFmtConfig {
    return Workspace.getConfiguration('phpfmt') as unknown as PHPFmtConfig;
  }

  public loadSettings(): void {
    this.config = this.getConfig();
    this.transformation = new Transformation(this.config.php_bin);

    this.args.length = 0;

    if (this.config.custom_arguments !== '') {
      this.args.push(this.config.custom_arguments);
      return;
    }

    if (this.config.psr1) {
      this.args.push('--psr1');
    }

    if (this.config.psr1_naming) {
      this.args.push('--psr1-naming');
    }

    if (this.config.psr2) {
      this.args.push('--psr2');
    }

    if (!this.config.detect_indent) {
      const spaces = this.config.indent_with_space;
      if (spaces === true) {
        this.args.push('--indent_with_space');
      } else if (spaces > 0) {
        this.args.push(`--indent_with_space=${spaces}`);
      }
    }

    if (this.config.enable_auto_align) {
      this.args.push('--enable_auto_align');
    }

    if (this.config.visibility_order) {
      this.args.push('--visibility_order');
    }

    const passes = this.config.passes;
    if (passes.length > 0) {
      this.args.push(`--passes=${passes.join(',')}`);
    }

    const exclude = this.config.exclude;
    if (exclude.length > 0) {
      this.args.push(`--exclude=${exclude.join(',')}`);
    }

    if (this.config.smart_linebreak_after_curly) {
      this.args.push('--smart_linebreak_after_curly');
    }

    if (this.config.yoda) {
      this.args.push('--yoda');
    }

    if (this.config.cakephp) {
      this.args.push('--cakephp');
    }
  }

  private getArgs(fileName: string): string[] {
    const args = this.args.slice(0);
    args.push(`"${fileName}"`);
    return args;
  }

  public async format(text: string): Promise<string> {
    const passes = [...this.config.passes, ...this.config.exclude];
    const transformations = await this.transformation.getTransformations();
    if (passes.length > 0) {
      const invalidPasses = passes.filter(
        pass =>
          !transformations.some(transformation => transformation.key === pass)
      );
      if (invalidPasses.length > 0) {
        throw new PHPFmtError(
          `passes or exclude invalid: ${invalidPasses.join(', ')}`
        );
      }
    }

    if (this.config.detect_indent) {
      const indentInfo = detectIndent(text);
      if (!indentInfo.type) {
        // fallback to default
        this.args.push('--indent_with_space');
      } else if (indentInfo.type === 'space') {
        this.args.push(`--indent_with_space=${indentInfo.amount}`);
      }
    } else {
      if (this.config.indent_with_space !== 4 && this.config.psr2) {
        throw new PHPFmtError(
          'For PSR2, code MUST use 4 spaces for indenting, not tabs.'
        );
      }
    }

    let fileName: string | undefined;
    let iniPath: string | undefined;
    const execOptions = { cwd: '' };
    if (Window.activeTextEditor != null) {
      fileName = Window.activeTextEditor.document.fileName;
      execOptions.cwd = path.dirname(fileName);

      const workspaceFolders: WorkspaceFolder[] | undefined =
        Workspace.workspaceFolders;
      if (workspaceFolders != null) {
        iniPath = await findUp('.phpfmt.ini', {
          cwd: execOptions.cwd
        });
        const origIniPath = iniPath;

        const workspaceFolder = workspaceFolders.find(folder =>
          iniPath?.startsWith(folder.uri.fsPath)
        );
        iniPath = workspaceFolder != null ? origIniPath : undefined;
      }
    }

    try {
      const { stdout, stderr } = await exec(
        `${this.config.php_bin} -r "echo PHP_VERSION_ID;"`,
        execOptions
      );
      if (stderr) {
        throw new PHPFmtError(`php_bin "${this.config.php_bin}" is invalid`);
      }
      if (Number(stdout.trim()) < 70000) {
        throw new PHPFmtError('PHP version < 7 is not supported');
      }
    } catch (err) {
      throw new PHPFmtError(`Error getting php version`);
    }

    const tmpDir = os.tmpdir();

    let tmpRandomFileName = `${tmpDir}/temp-${Math.random()
      .toString(36)
      .replace(/[^a-z]+/g, '')
      .substring(0, 10)}`;

    if (fileName) {
      const basename = path.basename(fileName);
      const ignore = this.config.ignore;
      if (ignore.length > 0) {
        for (const ignoreItem of ignore) {
          if (basename.match(ignoreItem) != null) {
            this.widget.addToOutput(
              `Ignored file ${basename} by match of ${ignoreItem}`
            );
            throw new PHPFmtIgnoreError();
          }
        }
      }
      tmpRandomFileName += `-${basename}`;
    } else {
      tmpRandomFileName += '.php';
    }

    const tmpFileName = path.normalize(tmpRandomFileName);

    try {
      await fs.promises.writeFile(tmpFileName, text);
    } catch (err) {
      this.widget.addToOutput(err.message);
      throw new PHPFmtError(`Cannot create tmp file in "${tmpDir}"`);
    }

    // test whether the php file has syntax error
    try {
      await exec(`${this.config.php_bin} -l ${tmpFileName}`, execOptions);
    } catch (err) {
      this.widget.addToOutput(err.message);
      Window.setStatusBarMessage(
        'phpfmt: Format failed - syntax errors found',
        4500
      );
      throw new PHPFmtIgnoreError();
    }

    const args = this.getArgs(tmpFileName);
    args.unshift(`"${phpfmt.pharPath}"`);

    let formatCmd: string;
    if (!iniPath) {
      formatCmd = `${this.config.php_bin} ${args.join(' ')}`;
    } else {
      this.widget.addToOutput(`Using config file: ${iniPath}`);
      formatCmd = `${this.config.php_bin} ${
        args[0]
      } --config=${iniPath} ${args.pop()}`;
    }

    this.widget.addToOutput(`Executing process: ${formatCmd}`);

    try {
      await exec(formatCmd, execOptions);
    } catch (err) {
      this.widget.addToOutput(err.message).show();
      throw new PHPFmtError('Execute phpfmt failed');
    }

    const formatted = await fs.promises.readFile(tmpFileName, 'utf-8');
    try {
      await fs.promises.unlink(tmpFileName);
    } catch (err) {}

    if (formatted.length > 0) {
      return formatted;
    }
    throw new PHPFmtIgnoreError();
  }
}
