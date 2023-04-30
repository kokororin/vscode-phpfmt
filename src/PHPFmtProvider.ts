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
import pkg from 'pjson';
import { PHPFmt } from './PHPFmt';
import { Widget } from './Widget';
import { Transformations } from './Transformations';
import { PHPFmtIgnoreError } from './PHPFmtError';

export class PHPFmtProvider {
  private readonly widget: Widget;
  private readonly phpfmt: PHPFmt;
  private readonly documentSelector: DocumentSelector;
  private readonly transformations: Transformations;
  private readonly config: WorkspaceConfiguration;

  public constructor() {
    this.widget = new Widget();
    this.config = Workspace.getConfiguration('phpfmt');
    this.phpfmt = new PHPFmt(this.config, this.widget);
    this.documentSelector = [
      { language: 'php', scheme: 'file' },
      { language: 'php', scheme: 'untitled' }
    ];
    this.widget.addToOutput(`Extension Version: ${pkg.version}`);
    this.transformations = new Transformations(
      this.config.get('php_bin', 'php')
    );
  }

  public registerOnDidChangeConfiguration(): Disposable {
    return Workspace.onDidChangeConfiguration(() => {
      this.phpfmt.loadSettings();
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
    const transformationItems = await this.transformations.getTransformations();
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
        const output = await this.transformations.getExample({
          key: result.label,
          description: result.description ?? ''
        });
        this.widget.addToOutput(`Transformation\n${output}`).show();
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
