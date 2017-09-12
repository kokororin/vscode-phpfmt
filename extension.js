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
    this.loadSettings();
  }

  loadSettings() {
    const config = workspace.getConfiguration('phpfmt');

    this.executablePath = config.get('php_bin');

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
  }

  getArgs(fileName) {
    const args = this.args.slice(0);
    args.push(fileName);
    return args;
  }

  format(context, text) {
    const fileName =
      tmpDir +
      '/temp-' +
      Math.random()
        .toString(36)
        .replace(/[^a-z]+/g, '')
        .substr(0, 10) +
      '.php';
    fs.writeFileSync(fileName, text);

    const args = this.getArgs(fileName);
    args.unshift(`${context.extensionPath}/fmt.phar`);

    const exec = cp.spawn(this.executablePath, args);

    exec.stdout.on('data', buffer => {
      console.log(buffer.toString());
    });
    exec.stderr.on('data', buffer => {
      console.log(buffer.toString());
    });
    exec.on('close', code => {
      console.log(code);
    });

    return new Promise((resolve, reject) => {
      exec.addListener('error', () => {
        reject();
      });
      exec.addListener('exit', code => {
        console.log(code);
        if (code === 0) {
          const formatted = fs.readFileSync(fileName, 'utf-8');
          if (formatted.length > 0) {
            resolve(formatted);
          } else {
            reject();
          }
        } else {
          // TODO Show the error message
          window.showErrorMessage('phpfmt return a code <> 0');
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
  const phpfmt = new PHPFmt();

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
