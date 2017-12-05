import {
  workspace as Workspace,
  window as Window,
  commands as Commands,
  languages as Languages,
  Position,
  Range,
  TextEdit,
  Disposable,
  ExtensionContext
} from 'vscode';
import PHPFmt from './PHPFmt';

export default class PHPFmtProvider {
  private phpfmt: PHPFmt;

  public constructor(phpfmt: PHPFmt) {
    this.phpfmt = phpfmt;
  }

  onDidChangeConfiguration(): Disposable {
    return Workspace.onDidChangeConfiguration(() => {
      this.phpfmt.loadSettings();
    });
  }

  onWillSaveTextDocument(): Disposable {
    return Workspace.onWillSaveTextDocument(event => {
      if (event.document.languageId === 'php') {
        if (this.phpfmt.getConfig().format_on_save) {
          event.waitUntil(
            Commands.executeCommand('editor.action.formatDocument')
          );
        }
      }
    });
  }

  textEditorCommand(): Disposable {
    return Commands.registerTextEditorCommand('phpfmt.format', textEditor => {
      if (textEditor.document.languageId === 'php') {
        Commands.executeCommand('editor.action.formatDocument');
      }
    });
  }

  documentFormattingEditProvider(context: ExtensionContext): Disposable {
    return Languages.registerDocumentFormattingEditProvider('php', {
      provideDocumentFormattingEdits: document => {
        return new Promise<any>((resolve, reject) => {
          const originalText: string = document.getText();
          const lastLine = document.lineAt(document.lineCount - 1);
          const range: Range = new Range(
            new Position(0, 0),
            lastLine.range.end
          );

          this.phpfmt
            .format(context, originalText)
            .then((text: string) => {
              if (text !== originalText) {
                resolve([new TextEdit(range, text)]);
              } else {
                reject();
              }
            })
            .catch(err => {
              if (err instanceof Error) {
                Window.showErrorMessage(err.message);
              }
              reject();
            });
        });
      }
    });
  }

  documentRangeFormattingEditProvider(context: ExtensionContext): Disposable {
    return Languages.registerDocumentRangeFormattingEditProvider('php', {
      provideDocumentRangeFormattingEdits: (document, range) => {
        return new Promise<any>((resolve, reject) => {
          let originalText: string = document.getText(range);
          if (originalText.replace(/\s+/g, '').length === 0) {
            return reject();
          }

          let hasModified: boolean = false;
          if (originalText.search(/^\s*<\?php/i) === -1) {
            originalText = `<?php\n${originalText}`;
            hasModified = true;
          }

          this.phpfmt
            .format(context, originalText)
            .then((text: string) => {
              if (hasModified) {
                text = text.replace(/^<\?php\r?\n/, '');
              }
              if (text !== originalText) {
                resolve([new TextEdit(range, text)]);
              } else {
                reject();
              }
            })
            .catch(err => {
              if (err instanceof Error) {
                Window.showErrorMessage(err.message);
              }
              reject();
            });
        });
      }
    });
  }
}
