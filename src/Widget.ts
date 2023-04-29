import {
  window as Window,
  type OutputChannel,
  type StatusBarItem,
  StatusBarAlignment,
  type TextEditor
} from 'vscode';
import dayjs from 'dayjs';

export class Widget {
  private readonly outputChannel: OutputChannel;
  private readonly statusBarItem: StatusBarItem;
  private static instance: Widget;

  public static getInstance(): Widget {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!this.instance) {
      this.instance = new Widget();
    }
    return this.instance;
  }

  public constructor() {
    this.outputChannel = Window.createOutputChannel('phpfmt');
    this.statusBarItem = Window.createStatusBarItem(
      StatusBarAlignment.Right,
      -1
    );
    this.statusBarItem.text = 'phpfmt';
    this.statusBarItem.command = 'phpfmt.openOutput';
    this.toggleStatusBarItem(Window.activeTextEditor);
  }

  public toggleStatusBarItem(editor: TextEditor | undefined): void {
    if (typeof editor === 'undefined') {
      return;
    }
    if (editor.document.languageId === 'php') {
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }

  public getOutputChannel(): OutputChannel {
    return this.outputChannel;
  }

  public addToOutput(message: string): OutputChannel {
    const now = dayjs();
    this.outputChannel.appendLine(`[${now.format('HH:mm:ss.SSS')}] ${message}`);
    return this.outputChannel;
  }
}
