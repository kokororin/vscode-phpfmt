import {
  workspace as Workspace,
  window as Window,
  commands as Commands,
  languages as Languages,
  Position,
  Range,
  TextEdit,
  type Disposable,
  type DocumentSelector,
  type QuickPickItem
} from 'vscode';
import pkg from 'pjson';
import type { PHPFmt } from './PHPFmt';
import type { Widget } from './Widget';
import { Transformations } from './Transformations';
import type { TransformationItem } from './types';
import { PHPFmtIgnoreError } from './PHPFmtError';

export default class PHPFmtProvider {
  private readonly phpfmt: PHPFmt;
  private readonly widget: Widget;
  private readonly documentSelector: DocumentSelector;

  public constructor(phpfmt: PHPFmt) {
    this.phpfmt = phpfmt;
    this.widget = this.phpfmt.getWidget();
    this.documentSelector = [
      { language: 'php', scheme: 'file' },
      { language: 'php', scheme: 'untitled' }
    ];
    this.phpfmt.getWidget().addToOutput(`Extension Version: ${pkg.version}`);
  }

  public onDidChangeConfiguration(): Disposable {
    return Workspace.onDidChangeConfiguration(() => {
      this.phpfmt.loadSettings();
    });
  }

  public formatCommand(): Disposable {
    return Commands.registerTextEditorCommand('phpfmt.format', textEditor => {
      if (textEditor.document.languageId === 'php') {
        void Commands.executeCommand('editor.action.formatDocument');
      }
    });
  }

  public listTransformationsCommand(): Disposable {
    return Commands.registerCommand('phpfmt.listTransformations', () => {
      const transformations = new Transformations(
        this.phpfmt.getConfig().php_bin
      );

      const transformationItems: TransformationItem[] =
        transformations.getTransformations();

      const items: QuickPickItem[] = [];
      for (const item of transformationItems) {
        items.push({
          label: item.key,
          description: item.description
        });
      }

      void Window.showQuickPick(items).then(result => {
        if (typeof result !== 'undefined') {
          const output = transformations.getExample({
            key: result.label,
            description: result.description ?? ''
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
        provideDocumentFormattingEdits: async document => {
          try {
            const originalText = document.getText();
            const lastLine = document.lineAt(document.lineCount - 1);
            const range = new Range(new Position(0, 0), lastLine.range.end);

            const text = await this.phpfmt.format(originalText);
            if (text !== originalText) {
              return [new TextEdit(range, text)];
            }
          } catch (err) {
            if (!(err instanceof PHPFmtIgnoreError) && err instanceof Error) {
              void Window.showErrorMessage(err.message);
              this.widget.addToOutput(err.message);
            }
          }
          return [];
        }
      }
    );
  }

  public documentRangeFormattingEditProvider(): Disposable {
    return Languages.registerDocumentRangeFormattingEditProvider(
      this.documentSelector,
      {
        provideDocumentRangeFormattingEdits: async (document, range) => {
          try {
            let originalText = document.getText(range);
            if (originalText.replace(/\s+/g, '').length === 0) {
              return [];
            }

            let hasModified = false;
            if (originalText.search(/^\s*<\?php/i) === -1) {
              originalText = `<?php\n${originalText}`;
              hasModified = true;
            }

            let text = await this.phpfmt.format(originalText);
            if (hasModified) {
              text = text.replace(/^<\?php\r?\n/, '');
            }
            if (text !== originalText) {
              return [new TextEdit(range, text)];
            }
          } catch (err) {
            if (!(err instanceof PHPFmtIgnoreError) && err instanceof Error) {
              void Window.showErrorMessage(err.message);
              this.widget.addToOutput(err.message);
            }
          }
          return [];
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
