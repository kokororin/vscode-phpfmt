import type * as vscode from 'vscode';
import { PHPFmtProvider } from './PHPFmtProvider';
import { PHPFmt } from './PHPFmt';
import { Widget } from './Widget';

export function activate(context: vscode.ExtensionContext): void {
  const widget = new Widget();
  const phpfmt = new PHPFmt(widget);

  const provider = new PHPFmtProvider(widget, phpfmt);

  context.subscriptions.push(
    provider.registerOnDidChangeConfiguration(),
    provider.registerFormatCommand(),
    provider.registerListTransformationsCommand(),
    ...provider.registerToggleTransformationsCommand(),
    ...provider.registerToggleBooleanCommand(),
    provider.registerToggleIndentWithSpaceCommand(),
    provider.registerDocumentFormattingEditProvider(),
    provider.registerDocumentRangeFormattingEditProvider(),
    ...provider.registerStatusBarItem()
  );
}
