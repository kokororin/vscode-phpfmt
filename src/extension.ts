import {
  workspace,
  commands,
  languages,
  Position,
  Range,
  TextEdit,
  ExtensionContext
} from 'vscode';
import PHPFmt from './PHPFmt';

export function activate(context: ExtensionContext) {
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
          const originalText: string = document.getText();
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
}
