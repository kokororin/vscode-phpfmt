import {
  workspace as Workspace,
  window as Window,
  ExtensionContext
} from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as cp from 'child_process';
import { PHPFmtConfig } from './types.d';

class PHPFmt {
  private args: Array<string> = [];
  private phpBin: string;
  public formatOnSave: boolean = false;

  public constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    const config: PHPFmtConfig = Workspace.getConfiguration('phpfmt') as any;

    this.phpBin = config.php_bin;

    if (config.format_on_save) {
      this.formatOnSave = true;
    }

    if (config.psr1) {
      this.args.push('--psr1');
    }

    if (config.psr1_naming) {
      this.args.push('--psr1-naming');
    }

    if (config.psr2) {
      this.args.push('--psr2');
    }

    const spaces = config.indent_with_space;
    if (spaces > 0) {
      this.args.push(`--indent_with_space=${spaces}`);
    } else {
      this.args.push('--indent_with_space');
    }

    if (config.enable_auto_align) {
      this.args.push('--enable_auto_align');
    }

    if (config.visibility_order) {
      this.args.push('--visibility_order');
    }

    const passes = config.passes;
    if (passes.length > 0) {
      this.args.push(`--passes=${passes.join(',')}`);
    }

    if (config.smart_linebreak_after_curly) {
      this.args.push('--smart_linebreak_after_curly');
    }

    if (config.yoda) {
      this.args.push('--yoda');
    }
  }

  private getArgs(fileName: string): Array<string> {
    const args: Array<string> = this.args.slice(0);
    args.push(fileName);
    return args;
  }

  public format(context: ExtensionContext, text: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      try {
        const stdout = cp.execSync(`${this.phpBin} -r "echo PHP_VERSION_ID;"`);
        if (Number(stdout.toString()) < 70000) {
          Window.showErrorMessage('phpfmt: php version < 7.0');
          return reject();
        }
      } catch (e) {
        Window.showErrorMessage('phpfmt: cannot find php bin');
        return reject();
      }

      const tmpDir: string = os.tmpdir();

      const fileName: string = `${tmpDir}/temp-${Math.random()
        .toString(36)
        .replace(/[^a-z]+/g, '')
        .substr(0, 10)}.php`;

      fs.writeFileSync(fileName, text);

      // test whether the php file has syntax error
      try {
        cp.execSync(`${this.phpBin} -l ${fileName}`);
      } catch (e) {
        Window.setStatusBarMessage(
          'phpfmt: format failed - syntax errors found',
          4500
        );
        return reject();
      }

      const args: Array<string> = this.getArgs(fileName);
      args.unshift(`${context.extensionPath}/fmt.phar`);

      const exec = cp.spawn(this.phpBin, args);

      exec.addListener('error', () => {
        Window.showErrorMessage('phpfmt: run phpfmt failed');
        reject();
      });
      exec.addListener('exit', code => {
        if (code === 0) {
          const formatted: string = fs.readFileSync(fileName, 'utf-8');
          if (formatted.length > 0) {
            resolve(formatted);
          } else {
            reject();
          }
        } else {
          Window.showErrorMessage('phpfmt: fmt.phar returns an invalid code');
          reject();
        }

        try {
          fs.unlinkSync(fileName);
        } catch (err) {}
      });
    });
  }
}

export default PHPFmt;
