import {
  workspace as Workspace,
  window as Window,
  commands as Commands,
  languages as Languages,
  Position,
  Range,
  TextEdit,
  ConfigurationTarget,
  type Disposable,
  type DocumentSelector,
  type QuickPickItem,
  type WorkspaceConfiguration
} from 'vscode';
import type { PHPFmt } from './PHPFmt';
import { type Widget, PHPFmtStatus } from './Widget';
import type { Transformation } from './Transformation';
import { PHPFmtSkipError } from './PHPFmtError';

export class PHPFmtProvider {
  private readonly documentSelector: DocumentSelector;
  private transformation: Transformation;
  private config: WorkspaceConfiguration;

  public constructor(
    private readonly widget: Widget,
    private readonly phpfmt: PHPFmt
  ) {
    this.config = Workspace.getConfiguration('phpfmt');
    this.documentSelector = [
      { language: 'php', scheme: 'file' },
      { language: 'php', scheme: 'untitled' }
    ];
    this.transformation = this.phpfmt.getTransformation();
  }

  public registerOnDidChangeConfiguration(): Disposable {
    return Workspace.onDidChangeConfiguration(() => {
      this.config = Workspace.getConfiguration('phpfmt');
      this.phpfmt.loadSettings();
      this.transformation = this.phpfmt.getTransformation();
      this.widget.logInfo(`settings reloaded`);
    });
  }

  public registerFormatCommand(): Disposable {
    return Commands.registerTextEditorCommand('phpfmt.format', textEditor => {
      if (textEditor.document.languageId === 'php') {
        void Commands.executeCommand('editor.action.formatDocument');
      }
    });
  }

  private async getTransformationItems(): Promise<QuickPickItem[]> {
    const transformationItems = await this.transformation.getTransformations();
    const items = transformationItems.map(o => ({
      label: o.key,
      description: o.description
    }));
    return items;
  }

  public registerListTransformationsCommand(): Disposable {
    return Commands.registerCommand('phpfmt.listTransformations', async () => {
      const items = await this.getTransformationItems();
      const result = await Window.showQuickPick(items);

      if (typeof result !== 'undefined') {
        this.widget.logInfo('Getting transformation output');
        const output = await this.transformation.getExample({
          key: result.label,
          description: result.description ?? ''
        });

        this.widget.getOutputChannel().appendLine(output);
        this.widget.getOutputChannel().show();
      }
    });
  }

  private async showUpdateConfigQuickPick<T>(
    section: string,
    value: T
  ): Promise<void> {
    const targetResult = await Window.showQuickPick(['Global', 'Workspace'], {
      placeHolder: 'Where to update settings.json?'
    });
    let target: ConfigurationTarget;

    if (targetResult === 'Global') {
      target = ConfigurationTarget.Global;
    } else {
      target = ConfigurationTarget.Workspace;
    }

    try {
      await this.config.update(section, value, target);
      await Window.showInformationMessage(
        'Configuration updated successfully!'
      );
    } catch (err) {
      await Window.showErrorMessage('Configuration updated failed!');
    }
  }

  public registerToggleTransformationsCommand(): Disposable[] {
    const commands = [
      {
        command: 'toggleAdditionalTransformations',
        key: 'passes'
      },
      {
        command: 'toggleExcludedTransformations',
        key: 'exclude'
      }
    ];

    return commands.map(command =>
      Commands.registerCommand(`phpfmt.${command.command}`, async () => {
        const items = await this.getTransformationItems();
        items.unshift({
          label: 'All',
          description: 'Choose all of following'
        });

        const result = await Window.showQuickPick(items);

        if (typeof result !== 'undefined') {
          let value = this.config.get<string[]>(command.key);
          if (result.label === 'All') {
            value = items.filter(o => o.label !== 'All').map(o => o.label);
          } else {
            const enabled = value?.includes(result.label);
            const enableResult = await Window.showQuickPick([
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

  public registerToggleBooleanCommand(): Disposable[] {
    const commands = [
      {
        command: 'togglePSR1Naming',
        key: 'psr1_naming'
      },
      {
        command: 'togglePSR1',
        key: 'psr1'
      },
      {
        command: 'togglePSR2',
        key: 'psr2'
      },
      {
        command: 'toggleAutoAlign',
        key: 'enable_auto_align'
      }
    ];

    return commands.map(command =>
      Commands.registerCommand(`phpfmt.${command.command}`, async () => {
        const value = this.config.get<boolean>(command.key);
        const result = await Window.showQuickPick([
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

  public registerToggleIndentWithSpaceCommand(): Disposable {
    return Commands.registerCommand(
      'phpfmt.toggleIndentWithSpace',
      async () => {
        const result = await Window.showQuickPick(['tabs', '2', '4', '6', '8']);

        if (typeof result !== 'undefined') {
          const value = result === 'tabs' ? false : Number(result);

          await this.showUpdateConfigQuickPick('indent_with_space', value);
        }
      }
    );
  }

  public registerDocumentFormattingEditProvider(): Disposable {
    return Languages.registerDocumentFormattingEditProvider(
      this.documentSelector,
      {
        provideDocumentFormattingEdits: async document => {
          try {
            const originalText = document.getText();
            const lastLine = document.lineAt(document.lineCount - 1);
            const range = new Range(new Position(0, 0), lastLine.range.end);

            const text = await this.phpfmt.format(originalText);
            this.widget.updateStatusBarItem(PHPFmtStatus.Success);
            if (text && text !== originalText) {
              return [new TextEdit(range, text)];
            }
          } catch (err) {
            this.widget.updateStatusBarItem(PHPFmtStatus.Error);
            if (!(err instanceof PHPFmtSkipError) && err instanceof Error) {
              void Window.showErrorMessage(err.message);
              this.widget.logError('Format failed', err);
            }
          }
          return [];
        }
      }
    );
  }

  public registerDocumentRangeFormattingEditProvider(): Disposable {
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
            this.widget.updateStatusBarItem(PHPFmtStatus.Success);
            if (text && text !== originalText) {
              return [new TextEdit(range, text)];
            }
          } catch (err) {
            this.widget.updateStatusBarItem(PHPFmtStatus.Error);
            if (!(err instanceof PHPFmtSkipError) && err instanceof Error) {
              void Window.showErrorMessage(err.message);
              this.widget.logError('Format failed', err);
            }
          }
          return [];
        }
      }
    );
  }

  public registerStatusBarItem(): Disposable[] {
    return [
      Window.onDidChangeActiveTextEditor(editor => {
        this.widget.toggleStatusBarItem(editor);
      }),
      Commands.registerCommand('phpfmt.openOutput', () => {
        this.widget.getOutputChannel().show();
      })
    ];
  }
}
