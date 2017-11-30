import {
  workspace as Workspace,
  window as Window,
  ExtensionContext
} from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import { execSync, spawn, ChildProcess } from 'child_process';
import * as detectIndent from 'detect-indent';
import IPHPFmtConfig from './IPHPFmtConfig';

class PHPFmt {
  private args: Array<string> = [];
  private phpBin: string;
  public formatOnSave: boolean = false;
  private detectIndent: boolean = false;

  public constructor() {
    this.loadSettings();
  }

  public loadSettings(): void {
    const config: IPHPFmtConfig = Workspace.getConfiguration('phpfmt') as any;

    this.phpBin = config.php_bin;
    this.formatOnSave = config.format_on_save;
    this.detectIndent = config.detect_indent;

    if (config.custom_arguments !== '') {
      this.args.push(config.custom_arguments);
      return;
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

    if (!this.detectIndent) {
      const spaces: number | boolean = config.indent_with_space;
      if (config.indent_with_space === true) {
        this.args.push('--indent_with_space');
      } else if (spaces > 0) {
        this.args.push(`--indent_with_space=${spaces}`);
      }
    }

    if (config.enable_auto_align) {
      this.args.push('--enable_auto_align');
    }

    if (config.visibility_order) {
      this.args.push('--visibility_order');
    }

    const passes: Array<string> = config.passes;
    if (passes.length > 0) {
      this.args.push(`--passes=${passes.join(',')}`);
    }

    const exclude: Array<string> = config.exclude;
    if (exclude.length > 0) {
      this.args.push(`--exclude=${exclude.join(',')}`);
    }

    if (config.smart_linebreak_after_curly) {
      this.args.push('--smart_linebreak_after_curly');
    }

    if (config.yoda) {
      this.args.push('--yoda');
    }

    if (config.cakephp) {
      this.args.push('--cakephp');
    }
  }

  private getArgs(fileName: string): Array<string> {
    const args: Array<string> = this.args.slice(0);
    args.push(fileName);
    return args;
  }

  public format(context: ExtensionContext, text: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      if (this.detectIndent) {
        const indentInfo: detectIndent.IndentInfo = detectIndent(text);
        if (!indentInfo.type) {
          // fallback to default
          this.args.push('--indent_with_space');
        } else if (indentInfo.type === 'space') {
          this.args.push(`--indent_with_space=${indentInfo.amount}`);
        }
      }

      try {
        const stdout: Buffer = execSync(
          `${this.phpBin} -r "echo PHP_VERSION_ID;"`
        );
        if (Number(stdout.toString()) < 50600) {
          return reject(new Error('phpfmt: php version < 5.6'));
        }
      } catch (err) {
        return reject(new Error('phpfmt: cannot find php bin'));
      }

      const tmpDir: string = os.tmpdir();

      const fileName: string = `${tmpDir}/temp-${Math.random()
        .toString(36)
        .replace(/[^a-z]+/g, '')
        .substr(0, 10)}.php`;

      fs.writeFileSync(fileName, text);

      // test whether the php file has syntax error
      try {
        execSync(`${this.phpBin} -l ${fileName}`);
      } catch (e) {
        Window.setStatusBarMessage(
          'phpfmt: format failed - syntax errors found',
          4500
        );
        return reject();
      }

      const args: Array<string> = this.getArgs(fileName);
      args.unshift(`${context.extensionPath}/phpf.phar`);

      const exec: ChildProcess = spawn(this.phpBin, args);

      exec.addListener('error', () => {
        reject(new Error('phpfmt: run phpfmt failed'));
      });
      exec.addListener('exit', (code: number) => {
        if (code === 0) {
          const formatted: string = fs.readFileSync(fileName, 'utf-8');
          if (formatted.length > 0) {
            resolve(formatted);
          } else {
            reject();
          }
        } else {
          reject(new Error('phpfmt: phpf.phar returns an invalid code'));
        }

        try {
          fs.unlinkSync(fileName);
        } catch (err) {}
      });
    });
  }
}

export default PHPFmt;
