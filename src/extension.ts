import { ExtensionContext } from 'vscode';
import PHPFmt from './PHPFmt';
import PHPFmtProvider from './PHPFmtProvider';

export function activate(context: ExtensionContext): void {
  const provider: PHPFmtProvider = new PHPFmtProvider(new PHPFmt());

  context.subscriptions.push(
    provider.onDidChangeConfiguration(),
    provider.onWillSaveTextDocument(),
    provider.textEditorCommand(),
    provider.documentFormattingEditProvider(context),
    provider.documentRangeFormattingEditProvider(context)
  );
}
