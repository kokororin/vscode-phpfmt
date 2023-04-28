import {
  workspace as Workspace,
  window as Window,
  type WorkspaceFolder
} from 'vscode';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import detectIndent from 'detect-indent';
import findUp from 'find-up';
import phpfmt from 'use-phpfmt';
import type IPHPFmtConfig from './IPHPFmtConfig';
import Widget from './Widget';

class PHPFmt {
  private readonly widget: Widget;
  private config: IPHPFmtConfig = {} as any;
  private readonly args: string[] = [];

  public constructor() {
    this.loadSettings();
    this.widget = Widget.getInstance();
  }

  public loadSettings(): void {
    this.config = Workspace.getConfiguration('phpfmt') as any;
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
      const spaces: number | boolean = this.config.indent_with_space;
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

    const passes: string[] = this.config.passes;
    if (passes.length > 0) {
      this.args.push(`--passes=${passes.join(',')}`);
    }

    const exclude: string[] = this.config.exclude;
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

  public getWidget(): Widget {
    return this.widget;
  }

  public getConfig(): IPHPFmtConfig {
    return this.config;
  }

  private getArgs(fileName: string): string[] {
    const args: string[] = this.args.slice(0);
    args.push(`"${fileName}"`);
    return args;
  }

  public async format(text: string): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
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
          reject(
            new Error(
              'phpfmt: For PSR2, code MUST use 4 spaces for indenting, not tabs.'
            )
          );
          return;
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
          iniPath = findUp.sync('.phpfmt.ini', {
            cwd: execOptions.cwd
          });
          const origIniPath = iniPath;

          for (const workspaceFolder of workspaceFolders) {
            if (origIniPath?.startsWith(workspaceFolder.uri.fsPath)) {
              break;
            } else {
              iniPath = undefined;
            }
          }
        }
      }

      try {
        const stdout: Buffer = execSync(
          `${this.config.php_bin} -r "echo PHP_VERSION_ID;"`,
          execOptions
        );
        if (
          Number(stdout.toString()) < 50600 &&
          Number(stdout.toString()) > 80000
        ) {
          reject(new Error('phpfmt: PHP version < 5.6 or > 8.0'));
          return;
        }
      } catch (err) {
        reject(
          new Error(`phpfmt: php_bin "${this.config.php_bin}" is invalid`)
        );
        return;
      }

      const tmpDir: string = os.tmpdir();

      let tmpRandomFileName: string = `${tmpDir}/temp-${Math.random()
        .toString(36)
        .replace(/[^a-z]+/g, '')
        .substr(0, 10)}`;

      if (fileName) {
        const basename = path.basename(fileName);
        const ignore: string[] = this.config.ignore;
        if (ignore.length > 0) {
          for (const ignoreItem of ignore) {
            if (basename.match(ignoreItem) != null) {
              this.widget.addToOutput(
                `Ignored file ${basename} by match of ${ignoreItem}`
              );
              reject();
              return;
            }
          }
        }
        tmpRandomFileName += `-${basename}`;
      } else {
        tmpRandomFileName += '.php';
      }

      const tmpFileName: string = path.normalize(tmpRandomFileName);

      try {
        fs.writeFileSync(tmpFileName, text);
      } catch (err) {
        this.widget.addToOutput(err.message);
        reject(new Error(`phpfmt: Cannot create tmp file in "${tmpDir}"`));
        return;
      }

      // test whether the php file has syntax error
      try {
        execSync(`${this.config.php_bin} -l ${tmpFileName}`, execOptions);
      } catch (err) {
        this.widget.addToOutput(err.message);
        Window.setStatusBarMessage(
          'phpfmt: Format failed - syntax errors found',
          4500
        );
        reject();
        return;
      }

      const args: string[] = this.getArgs(tmpFileName);
      args.unshift(`"${phpfmt.pharPath}"`);

      let formatCmd: string;
      if (!iniPath) {
        formatCmd = `${this.config.php_bin} ${args.join(' ')}`;
      } else {
        formatCmd = `${this.config.php_bin} ${
          args[0]
        } --config=${iniPath} ${args.pop()}`;
      }

      this.widget.addToOutput(formatCmd);

      try {
        execSync(formatCmd, execOptions);
      } catch (err) {
        this.widget.addToOutput(err.message).show();
        reject(new Error('phpfmt: Execute phpfmt failed'));
        return;
      }

      const formatted: string = fs.readFileSync(tmpFileName, 'utf-8');
      try {
        fs.unlinkSync(tmpFileName);
      } catch (err) {}

      if (formatted.length > 0) {
        resolve(formatted);
      } else {
        reject();
      }
    });
  }
}

export default PHPFmt;
