import { window as Window, OutputChannel } from 'vscode';
import PHPFmt from './PHPFmt';

export default class Widget {
  private phpfmt: PHPFmt;
  private outputChannel: OutputChannel;
  private static instance: Widget;

  public static getInstance(phpfmt: PHPFmt): Widget {
    if (!this.instance) {
      this.instance = new Widget(phpfmt);
    }
    return this.instance;
  }

  public constructor(phpfmt: PHPFmt) {
    this.phpfmt = phpfmt;
    this.outputChannel = Window.createOutputChannel('phpfmt');
  }

  public addToOutput(message: string): void {
    if (this.phpfmt.getConfig().debug_mode) {
      const title = `${new Date().toLocaleString()}:`;
      this.outputChannel.appendLine(title);
      this.outputChannel.appendLine('-'.repeat(title.length));
      this.outputChannel.appendLine(`${message}\n`);
      this.outputChannel.show();
    }
  }
}
