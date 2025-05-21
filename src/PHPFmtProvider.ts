import * as vscode from 'vscode';
import type { PHPFmt } from './PHPFmt';
import { type Widget, PHPFmtStatus } from './Widget';
import type { Transformation } from './Transformation';
import { PHPFmtSkipError } from './PHPFmtError';
import * as meta from './meta';

export class PHPFmtProvider {
  private readonly documentSelector: vscode.DocumentSelector;
  private transformation: Transformation;
  private config: vscode.WorkspaceConfiguration;

  public constructor(
    private readonly widget: Widget,
    private readonly phpfmt: PHPFmt
  ) {
    this.config = vscode.workspace.getConfiguration('phpfmt');
    this.documentSelector = [
      { language: 'php', scheme: 'file' },
      { language: 'php', scheme: 'untitled' }
    ];
    this.transformation = this.phpfmt.getTransformation();
  }

  public registerOnDidChangeConfiguration(): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(() => {
      this.config = vscode.workspace.getConfiguration('phpfmt');
      this.phpfmt.loadSettings();
      this.transformation = this.phpfmt.getTransformation();
      this.widget.logInfo(`settings reloaded`);
    });
  }

  public registerFormatCommand(): vscode.Disposable {
    return vscode.commands.registerTextEditorCommand(
      meta.commands.format,
      textEditor => {
        if (textEditor.document.languageId === 'php') {
          void vscode.commands.executeCommand('editor.action.formatDocument');
        }
      }
    );
  }

  private async getTransformationItems(): Promise<vscode.QuickPickItem[]> {
    const transformationItems = await this.transformation.getTransformations();
    const items = transformationItems.map(o => ({
      label: o.key,
      description: o.description
    }));
    return items;
  }

  public registerListTransformationsCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(
      meta.commands.listTransformations,
      async () => {
        const items = await this.getTransformationItems();
        const result = await vscode.window.showQuickPick(items);

        if (typeof result !== 'undefined') {
          this.widget.logInfo('Getting transformation output');
          const output = await this.transformation.getExample({
            key: result.label,
            description: result.description ?? ''
          });

          this.widget.getOutputChannel().appendLine(output);
          this.widget.getOutputChannel().show();
        }
      }
    );
  }

  private async showUpdateConfigQuickPick<T>(
    section: string,
    value: T
  ): Promise<void> {
    const targetResult = await vscode.window.showQuickPick(
      ['Global', 'Workspace'],
      {
        placeHolder: 'Where to update settings.json?'
      }
    );
    let target: vscode.ConfigurationTarget;

    if (targetResult === 'Global') {
      target = vscode.ConfigurationTarget.Global;
    } else {
      target = vscode.ConfigurationTarget.Workspace;
    }

    try {
      await this.config.update(section, value, target);
      await vscode.window.showInformationMessage(
        'Configuration updated successfully!'
      );
    } catch (err) {
      await vscode.window.showErrorMessage('Configuration updated failed!');
    }
  }

  public registerToggleTransformationsCommand(): vscode.Disposable[] {
    const commands = [
      {
        command: meta.commands.toggleAdditionalTransformations,
        key: 'passes'
      },
      {
        command: meta.commands.toggleExcludedTransformations,
        key: 'exclude'
      }
    ];

    return commands.map(command =>
      vscode.commands.registerCommand(command.command, async () => {
        const items = await this.getTransformationItems();
        items.unshift({
          label: 'All',
          description: 'Choose all of following'
        });

        const result = await vscode.window.showQuickPick(items);

        if (typeof result !== 'undefined') {
          let value = this.config.get<string[]>(command.key);
          if (result.label === 'All') {
            value = items.filter(o => o.label !== 'All').map(o => o.label);
          } else {
            const enabled = value?.includes(result.label);
            const enableResult = await vscode.window.showQuickPick([
              {
                label: 'Enable',
                description: enabled ? 'Current' : ''
              },
              {
                label: 'Disable',
                description: !enabled ? 'Current' : ''
              }
            ]);
            if (typeof enableResult !== 'undefined') {
              if (enableResult.label === 'Enable' && !enabled) {
                value?.push(result.label);
              } else if (enableResult.label === 'Disable' && enabled) {
                value = value?.filter(v => v !== result.label);
              }
            }
          }

          await this.showUpdateConfigQuickPick(command.key, value);
        }
      })
    );
  }

  public registerToggleBooleanCommand(): vscode.Disposable[] {
    const commands = [
      {
        command: meta.commands.togglePSR1Naming,
        key: 'psr1_naming'
      },
      {
        command: meta.commands.togglePSR1,
        key: 'psr1'
      },
      {
        command: meta.commands.togglePSR2,
        key: 'psr2'
      },
      {
        command: meta.commands.toggleAutoAlign,
        key: 'enable_auto_align'
      }
    ];

    return commands.map(command =>
      vscode.commands.registerCommand(command.command, async () => {
        const value = this.config.get<boolean>(command.key);
        const result = await vscode.window.showQuickPick([
          {
            label: 'Enable',
            description: value ? 'Current' : ''
          },
          {
            label: 'Disable',
            description: !value ? 'Current' : ''
          }
        ]);

        if (typeof result !== 'undefined') {
          await this.showUpdateConfigQuickPick(
            command.key,
            result.label === 'Enable'
          );
        }
      })
    );
  }

  public registerToggleIndentWithSpaceCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(
      meta.commands.toggleIndentWithSpace,
      async () => {
        const result = await vscode.window.showQuickPick([
          'tabs',
          '2',
          '4',
          '6',
          '8'
        ]);

        if (typeof result !== 'undefined') {
          const value = result === 'tabs' ? false : Number(result);

          await this.showUpdateConfigQuickPick('indent_with_space', value);
        }
      }
    );
  }

  public registerDocumentFormattingEditProvider(): vscode.Disposable {
    return vscode.languages.registerDocumentFormattingEditProvider(
      this.documentSelector,
      {
        provideDocumentFormattingEdits: async document => {
          try {
            const originalText = document.getText();
            const lastLine = document.lineAt(document.lineCount - 1);
            const range = new vscode.Range(
              new vscode.Position(0, 0),
              lastLine.range.end
            );

            const text = await this.phpfmt.format(originalText);
            this.widget.updateStatusBarItem(PHPFmtStatus.Success);
            if (text && text !== originalText) {
              return [new vscode.TextEdit(range, text)];
            }
          } catch (err) {
            this.widget.updateStatusBarItem(PHPFmtStatus.Error);
            if (!(err instanceof PHPFmtSkipError) && err instanceof Error) {
              void vscode.window.showErrorMessage(err.message);
              this.widget.logError('Format failed', err);
            }
          }
          return [];
        }
      }
    );
  }

  public registerDocumentRangeFormattingEditProvider(): vscode.Disposable {
    return vscode.languages.registerDocumentRangeFormattingEditProvider(
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
            this.widget.updateStatusBarItem(PHPFmtStatus.Success);
            if (text && text !== originalText) {
              return [new vscode.TextEdit(range, text)];
            }
          } catch (err) {
            this.widget.updateStatusBarItem(PHPFmtStatus.Error);
            if (!(err instanceof PHPFmtSkipError) && err instanceof Error) {
              void vscode.window.showErrorMessage(err.message);
              this.widget.logError('Format failed', err);
            }
          }
          return [];
        }
      }
    );
  }

  public registerStatusBarItem(): vscode.Disposable[] {
    return [
      vscode.window.onDidChangeActiveTextEditor(editor => {
        this.widget.toggleStatusBarItem(editor);
      }),
      vscode.commands.registerCommand(meta.commands.openOutput, () => {
        this.widget.getOutputChannel().show();
      })
    ];
  }
}
