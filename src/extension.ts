import * as vscode from 'vscode';
import PHPFmt from './PHPFmt';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument(event => {
      if (event.document.languageId === 'php') {
        const phpfmt = new PHPFmt();
        if (phpfmt.formatOnSave) {
          event.waitUntil(
            vscode.commands.executeCommand('editor.action.formatDocument')
          );
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand('phpfmt.format', textEditor => {
      if (textEditor.document.languageId === 'php') {
        vscode.commands.executeCommand('editor.action.formatDocument');
      }
    })
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider('php', {
      provideDocumentFormattingEdits: document => {
        return new Promise((resolve, reject) => {
          const originalText: string = document.getText();
          const lastLine = document.lineAt(document.lineCount - 1);
          const range = new vscode.Range(
            new vscode.Position(0, 0),
            lastLine.range.end
          );

          const phpfmt = new PHPFmt();

          phpfmt
            .format(context, originalText)
            .then(text => {
              if (text !== originalText) {
                resolve([new vscode.TextEdit(range, text)]);
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
}
