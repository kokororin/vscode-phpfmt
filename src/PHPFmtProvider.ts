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
  static onWillSaveTextDocument(): Disposable {
    return Workspace.onWillSaveTextDocument(event => {
      if (event.document.languageId === 'php') {
        const phpfmt: PHPFmt = new PHPFmt();
        if (phpfmt.formatOnSave) {
          event.waitUntil(
            Commands.executeCommand('editor.action.formatDocument')
          );
        }
      }
    });
  }

  static textEditorCommand(): Disposable {
    return Commands.registerTextEditorCommand('phpfmt.format', textEditor => {
      if (textEditor.document.languageId === 'php') {
        Commands.executeCommand('editor.action.formatDocument');
      }
    });
  }

  static documentFormattingEditProvider(context: ExtensionContext): Disposable {
    return Languages.registerDocumentFormattingEditProvider('php', {
      provideDocumentFormattingEdits: document => {
        return new Promise<any>((resolve, reject) => {
          const originalText: string = document.getText();
          const lastLine = document.lineAt(document.lineCount - 1);
          const range: Range = new Range(
            new Position(0, 0),
            lastLine.range.end
          );

          const phpfmt: PHPFmt = new PHPFmt();

          phpfmt
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

  static documentRangeFormattingEditProvider(
    context: ExtensionContext
  ): Disposable {
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
          const phpfmt: PHPFmt = new PHPFmt();

          phpfmt
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
