import { type ExtensionContext } from 'vscode';
import { PHPFmtProvider } from './PHPFmtProvider';

export function activate(context: ExtensionContext): void {
  const provider = new PHPFmtProvider();

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
