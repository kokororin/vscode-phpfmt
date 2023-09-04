import {
  window as Window,
  type OutputChannel,
  type StatusBarItem,
  StatusBarAlignment,
  type TextEditor,
  ThemeColor
} from 'vscode';
import dayjs from 'dayjs';
import { type LogLevel } from './types';

export enum PHPFmtStatus {
  Ready = 'check-all',
  Success = 'check',
  Ignore = 'x',
  Warn = 'warning',
  Error = 'alert',
  Disabled = 'circle-slash'
}

export class Widget {
  private logLevel: LogLevel = 'INFO';
  private readonly outputChannel: OutputChannel;
  private readonly statusBarItem: StatusBarItem;

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
      this.updateStatusBarItem(PHPFmtStatus.Ready);
    } else {
      this.statusBarItem.hide();
    }
  }

  public updateStatusBarItem(result: PHPFmtStatus): void {
    this.statusBarItem.text = `$(${result.toString()}) phpfmt`;
    switch (result) {
      case PHPFmtStatus.Ignore:
      case PHPFmtStatus.Warn:
        this.statusBarItem.backgroundColor = new ThemeColor(
          'statusBarItem.warningBackground'
        );
        break;
      case PHPFmtStatus.Error:
        this.statusBarItem.backgroundColor = new ThemeColor(
          'statusBarItem.errorBackground'
        );
        break;
      default:
        this.statusBarItem.backgroundColor = new ThemeColor(
          'statusBarItem.fourgroundBackground'
        );
        break;
    }
    this.statusBarItem.show();
  }

  public getOutputChannel(): OutputChannel {
    return this.outputChannel;
  }

  public setOutputLevel(logLevel: LogLevel): void {
    this.logLevel = logLevel;
  }

  private logMessage(message: string, logLevel: LogLevel): void {
    const now = dayjs();
    this.outputChannel.appendLine(
      `${now.format('HH:mm:ss.SSS')} [${logLevel}] ${message}`
    );
  }

  private logObject(data: unknown): void {
    const message = JSON.stringify(data, null, 2);

    this.outputChannel.appendLine(message);
  }

  public logInfo(message: string, data?: unknown): OutputChannel {
    if (['NONE', 'WARN', 'ERROR'].includes(this.logLevel)) {
      return this.outputChannel;
    }
    this.logMessage(message, 'INFO');
    if (data) {
      this.logObject(data);
    }
    return this.outputChannel;
  }

  public logWarning(message: string, data?: unknown): OutputChannel {
    if (['NONE', 'ERROR'].includes(this.logLevel)) {
      return this.outputChannel;
    }
    this.logMessage(message, 'WARN');
    if (data) {
      this.logObject(data);
    }
    return this.outputChannel;
  }

  public logError(message: string, error?: unknown): OutputChannel {
    if (['NONE'].includes(this.logLevel)) {
      return this.outputChannel;
    }
    this.logMessage(message, 'ERROR');
    if (typeof error === 'string') {
      this.outputChannel.appendLine(error);
    } else if (error instanceof Error) {
      if (error?.message) {
        this.logMessage(error.message, 'ERROR');
      }
      // if (error?.stack) {
      //   this.outputChannel.appendLine(error.stack);
      // }
    } else if (error) {
      this.logObject(error);
    }
    return this.outputChannel;
  }
}
