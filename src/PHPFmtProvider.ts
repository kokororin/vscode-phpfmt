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
  QuickPickItem
} from 'vscode';
import PHPFmt from './PHPFmt';
import Widget from './Widget';
import Transformations from './Transformations';
import ITransformationItem from './ITransformationItem';

export default class PHPFmtProvider {
  private phpfmt: PHPFmt;
  private widget: Widget;
  private documentSelector: DocumentSelector;

  public constructor(phpfmt: PHPFmt) {
    this.phpfmt = phpfmt;
    this.widget = this.phpfmt.getWidget();
    this.documentSelector = [
      { language: 'php', scheme: 'file' },
      { language: 'php', scheme: 'untitled' }
    ];
  }

  public onDidChangeConfiguration(): Disposable {
    return Workspace.onDidChangeConfiguration(() => {
      this.phpfmt.loadSettings();
    });
  }

  public formatCommand(): Disposable {
    return Commands.registerTextEditorCommand('phpfmt.format', textEditor => {
      if (textEditor.document.languageId === 'php') {
        Commands.executeCommand('editor.action.formatDocument');
      }
    });
  }

  public listTransformationsCommand(): Disposable {
    return Commands.registerCommand('phpfmt.listTransformations', () => {
      const transformations = new Transformations(
        this.phpfmt.getConfig().php_bin
      );

      const transformationItems: Array<
        ITransformationItem
      > = transformations.getTransformations();

      const items: Array<QuickPickItem> = new Array<QuickPickItem>();
      for (const item of transformationItems) {
        items.push({
          label: item.key,
          description: item.description
        });
      }

      Window.showQuickPick(items).then(result => {
        if (typeof result !== 'undefined') {
          const output = transformations.getExample({
            key: result.label,
            description: result.description || ''
          });
          this.widget.addToOutput(output).show();
        }
      });
    });
  }

  public documentFormattingEditProvider(): Disposable {
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
              .format(originalText)
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
                  this.widget.addToOutput(err.message);
                }
                reject();
              });
          });
        }
      }
    );
  }

  public documentRangeFormattingEditProvider(): Disposable {
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
              .format(originalText)
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
                  this.widget.addToOutput(err.message);
                }
                reject();
              });
          });
        }
      }
    );
  }

  public statusBarItem(): Disposable[] {
    return [
      Window.onDidChangeActiveTextEditor(editor => {
        if (typeof this.statusBarItem !== 'undefined') {
          this.widget.toggleStatusBarItem(editor);
        }
      }),
      Commands.registerCommand('phpfmt.openOutput', () => {
        this.widget.getOutputChannel().show();
      })
    ];
  }
}
