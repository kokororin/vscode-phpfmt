const {
  commands,
  workspace,
  window,
  languages,
  Range,
  Position,
  TextEdit
} = require('vscode');
const fs = require('fs');
const os = require('os');
const cp = require('child_process');
const tmpDir = os.tmpdir();

class PHPFmt {
  constructor() {
    this.args = [];
    this.formatOnSave = false;
    this.loadSettings();
  }

  loadSettings() {
    const config = workspace.getConfiguration('phpfmt');

    this.phpBin = config.get('php_bin');

    if (config.get('format_on_save')) {
      this.formatOnSave = true;
    }

    if (config.get('psr1')) {
      this.args.push('--psr1');
    }

    if (config.get('psr1_naming')) {
      this.args.push('--psr1-naming');
    }

    if (config.get('psr2')) {
      this.args.push('--psr2');
    }

    const spaces = config.get('indent_with_space');
    if (spaces > 0) {
      this.args.push(`--indent_with_space=${spaces}`);
    } else {
      this.args.push('--indent_with_space');
    }

    if (config.get('enable_auto_align')) {
      this.args.push('--enable_auto_align');
    }

    if (config.get('visibility_order')) {
      this.args.push('--visibility_order');
    }

    const passes = config.get('passes');
    if (passes.length > 0) {
      this.args.push(`--passes=${passes.join(',')}`);
    }

    if (config.get('smart_linebreak_after_curly')) {
      this.args.push('--smart_linebreak_after_curly');
    }

    if (config.get('yoda')) {
      this.args.push('--yoda');
    }
  }

  getArgs(fileName) {
    const args = this.args.slice(0);
    args.push(fileName);
    return args;
  }

  format(context, text) {
    return new Promise((resolve, reject) => {
      try {
        const stdout = cp.execSync(`${this.phpBin} -r "echo PHP_VERSION_ID;"`);
        if (Number(stdout.toString()) < 70000) {
          window.showErrorMessage('phpfmt: php version < 7.0');
          return reject();
        }
      } catch (e) {
        window.showErrorMessage('phpfmt: cannot find php bin');
        return reject();
      }

      const fileName =
        tmpDir +
        '/temp-' +
        Math.random()
          .toString(36)
          .replace(/[^a-z]+/g, '')
          .substr(0, 10) +
        '.php';
      fs.writeFileSync(fileName, text);

      // test whether the php file has syntax error
      try {
        cp.execSync(`${this.phpBin} -l ${fileName}`);
      } catch (e) {
        window.setStatusBarMessage('phpfmt: format failed - syntax errors found', 4500);
        return reject();
      }

      const args = this.getArgs(fileName);
      args.unshift(`${context.extensionPath}/fmt.phar`);

      const exec = cp.spawn(this.phpBin, args);

      exec.stdout.on('data', buffer => {
        console.log(buffer.toString());
      });
      exec.stderr.on('data', buffer => {
        console.log(buffer.toString());
      });
      exec.on('close', code => {
        console.log(code);
      });

      exec.addListener('error', () => {
        window.showErrorMessage('phpfmt: run phpfmt failed');
        reject();
      });
      exec.addListener('exit', code => {
        if (code === 0) {
          const formatted = fs.readFileSync(fileName, 'utf-8');
          if (formatted.length > 0) {
            resolve(formatted);
          } else {
            reject();
          }
        } else {
          // TODO Show the error message
          window.showErrorMessage('phpfmt: fmt.phar returns an invalid code');
          reject();
        }

        try {
          fs.unlinkSync(fileName);
        } catch (err) {}
      });
    });
  }
}

exports.activate = context => {
  context.subscriptions.push(
    workspace.onWillSaveTextDocument(event => {
      if (event.document.languageId === 'php') {
        const phpfmt = new PHPFmt();
        if (phpfmt.formatOnSave) {
          event.waitUntil(
            commands.executeCommand('editor.action.formatDocument')
          );
        }
      }
    })
  );

  context.subscriptions.push(
    commands.registerTextEditorCommand('phpfmt.format', textEditor => {
      if (textEditor.document.languageId === 'php') {
        commands.executeCommand('editor.action.formatDocument');
      }
    })
  );

  context.subscriptions.push(
    languages.registerDocumentFormattingEditProvider('php', {
      provideDocumentFormattingEdits: document => {
        return new Promise((resolve, reject) => {
          const originalText = document.getText();
          const lastLine = document.lineAt(document.lineCount - 1);
          const range = new Range(new Position(0, 0), lastLine.range.end);

          const phpfmt = new PHPFmt();

          phpfmt
            .format(context, originalText)
            .then(text => {
              if (text !== originalText) {
                resolve([new TextEdit(range, text)]);
              } else {
                reject();
              }
            })
            .catch(() => {
              reject();
            });
        });
      }
    })
  );
};
