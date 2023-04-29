import { type ExtensionContext } from 'vscode';
import { PHPFmt } from './PHPFmt';
import { PHPFmtProvider } from './PHPFmtProvider';

export function activate(context: ExtensionContext): void {
  const provider = new PHPFmtProvider(new PHPFmt());

  context.subscriptions.push(
    provider.onDidChangeConfiguration(),
    provider.formatCommand(),
    provider.listTransformationsCommand(),
    provider.documentFormattingEditProvider(),
    provider.documentRangeFormattingEditProvider(),
    ...provider.statusBarItem()
  );
}
