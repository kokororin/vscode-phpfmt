import { ExtensionContext } from 'vscode';
import PHPFmtProvider from './PHPFmtProvider';

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    PHPFmtProvider.onWillSaveTextDocument(),
    PHPFmtProvider.textEditorCommand(),
    PHPFmtProvider.documentFormattingEditProvider(context),
    PHPFmtProvider.documentRangeFormattingEditProvider(context)
  );
}
