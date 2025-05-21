import * as vscode from 'vscode';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import detectIndent from 'detect-indent';
import findUp from 'find-up';
import { compare } from 'compare-versions';
import phpfmt, { type PHPFmt as IPHPFmt } from 'phpfmt';
import type { SnakeCase } from 'type-fest';
import { type Widget, PHPFmtStatus } from './Widget';
import { Transformation } from './Transformation';
import { PHPFmtError, PHPFmtSkipError } from './PHPFmtError';
import { exec } from './utils';
import type * as meta from './meta';

export type PHPFmtConfig = {
  [K in keyof meta.ConfigShorthandTypeMap as SnakeCase<K>]: meta.ConfigShorthandTypeMap[K];
};

export class PHPFmt {
  private config: PHPFmtConfig;
  private transformation: Transformation;
  private readonly args: string[] = [];

  public constructor(private readonly widget: Widget) {
    this.config = this.getConfig();
    this.transformation = new Transformation(
      this.config.php_bin,
      this.getFmt()
    );
    this.loadSettings();
  }

  private getConfig(): PHPFmtConfig {
    return vscode.workspace.getConfiguration(
      'phpfmt'
    ) as unknown as PHPFmtConfig;
  }

  public loadSettings(): void {
    this.config = this.getConfig();
    this.transformation = new Transformation(
      this.config.php_bin,
      this.getFmt()
    );

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

    if (this.config.wp) {
      this.args.push('--wp');
    }

    if (!this.config.detect_indent) {
      const spaces = this.config.indent_with_space;
      if (spaces === true) {
        this.args.push('--indent_with_space');
      } else if (typeof spaces === 'number' && spaces > 0) {
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

  public getFmt(): IPHPFmt {
    return this.config.use_old_phpfmt ? phpfmt.v1 : phpfmt.v2;
  }

  public getPharPath(): string {
    return this.getFmt().pharPath;
  }

  public getTransformation(): Transformation {
    return this.transformation;
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
      const invalidPasses: string[] = [];
      for (const pass of passes) {
        if (
          !transformations.some(
            transformation => transformation.key === pass
          ) &&
          !this.transformation.isExists(pass)
        ) {
          invalidPasses.push(pass);
        }
      }

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
    if (vscode.window.activeTextEditor != null) {
      fileName = vscode.window.activeTextEditor.document.fileName;
      execOptions.cwd = path.dirname(fileName);

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders != null) {
        iniPath = await findUp('.php.tools.ini', {
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
      const { stdout, stderr, code } = await exec(
        `${this.config.php_bin} -v`,
        execOptions
      );
      if (code !== 0) {
        this.widget.logError('getting php version failed', stderr);
        throw new PHPFmtError(`"php -v" returns non-zero code`);
      }
      const match = /PHP ([\d.]+)/i.exec(stdout);
      if (match == null) {
        throw new PHPFmtError('Failed to parse php version');
      }
      const phpVersion = match[1];

      if (this.config.use_old_phpfmt) {
        if (
          compare(phpVersion, '5.6.0', '<') ||
          compare(phpVersion, '8.0.0', '>')
        ) {
          throw new PHPFmtError('PHP version < 5.6 or > 8.0');
        }
      } else {
        if (compare(phpVersion, '5.6.0', '<')) {
          throw new PHPFmtError('PHP version < 5.6');
        }
      }
    } catch (err) {
      if (err instanceof PHPFmtError) {
        throw err;
      } else {
        this.widget.logError('getting php version failed', err);
        throw new PHPFmtError(`Error getting php version`);
      }
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
            this.widget.logInfo(
              `Ignored file ${basename} by match of ${ignoreItem}`
            );
            this.widget.updateStatusBarItem(PHPFmtStatus.Ignore);
            return '';
          }
        }
      }
      tmpRandomFileName += `-${basename}`;
    } else {
      tmpRandomFileName += '.php';
    }

    const tmpFileName = path.normalize(tmpRandomFileName);

    try {
      await fs.writeFile(tmpFileName, text);
    } catch (err) {
      this.widget.logError('Create tmp file failed', err);
      throw new PHPFmtError(`Cannot create tmp file in "${tmpDir}"`);
    }

    // test whether the php file has syntax error
    try {
      await exec(`${this.config.php_bin} -l "${tmpFileName}"`, execOptions);
    } catch (err) {
      this.widget.logError('PHP lint failed', err);
      vscode.window.setStatusBarMessage(
        'phpfmt: Format failed - syntax errors found',
        4500
      );
      throw new PHPFmtSkipError();
    }

    const args = this.getArgs(tmpFileName);
    args.unshift(`"${this.getPharPath()}"`);

    let formatCmd: string;
    if (!iniPath) {
      formatCmd = `${this.config.php_bin} ${args.join(' ')}`;
    } else {
      this.widget.logInfo(`Using config file: ${iniPath}`);
      formatCmd = `${this.config.php_bin} ${
        args[0]
      } --config=${iniPath} ${args.pop()}`;
    }

    this.widget.logInfo(`Executing command: ${formatCmd}`);

    try {
      await exec(formatCmd, execOptions);
    } catch (err) {
      this.widget.logError('Execute command failed', err).show();
      throw new PHPFmtError('Execute phpfmt failed');
    }

    const formatted = await fs.readFile(tmpFileName, 'utf-8');
    try {
      await fs.unlink(tmpFileName);
    } catch (err) {
      this.widget.logError('Remove temp file failed', err);
    }

    return formatted;
  }
}
