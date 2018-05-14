import {
  workspace as Workspace,
  window as Window,
  commands as Commands,
  languages as Languages,
  Position,
  Range,
  TextEdit,
  Disposable,
  DocumentSelector,
  QuickPickItem,
  ExtensionContext
} from 'vscode';
import PHPFmt from './PHPFmt';
import Transformations from './Transformations';
import ITransformationItem from './ITransformationItem';

export default class PHPFmtProvider {
  private phpfmt: PHPFmt;
  private documentSelector: DocumentSelector;

  public constructor(phpfmt: PHPFmt) {
    this.phpfmt = phpfmt;
    this.documentSelector = [
      { language: 'php', scheme: 'file' },
      { language: 'php', scheme: 'untitled' }
    ];
  }

  onDidChangeConfiguration(): Disposable {
    return Workspace.onDidChangeConfiguration(() => {
      this.phpfmt.loadSettings();
    });
  }

  formatCommand(): Disposable {
    return Commands.registerTextEditorCommand(
      'extension.format',
      textEditor => {
        if (textEditor.document.languageId === 'php') {
          Commands.executeCommand('editor.action.formatDocument');
        }
      }
    );
  }

  listTransformationsCommand(context: ExtensionContext): Disposable {
    return Commands.registerCommand('extension.listTransformations', () => {
      const transformations: Array<
        ITransformationItem
      > = Transformations.getTransformations(
        context.extensionPath,
        this.phpfmt.getConfig().php_bin
      );

      const items: Array<QuickPickItem> = new Array<QuickPickItem>();
      for (const item of transformations) {
        items.push({
          label: item.key,
          description: item.description
        });
      }

      Window.showQuickPick(items);
    });
  }

  documentFormattingEditProvider(context: ExtensionContext): Disposable {
    return Languages.registerDocumentFormattingEditProvider(
      this.documentSelector,
      {
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
      }
    );
  }

  documentRangeFormattingEditProvider(context: ExtensionContext): Disposable {
    return Languages.registerDocumentRangeFormattingEditProvider(
      this.documentSelector,
      {
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
      }
    );
  }
}
