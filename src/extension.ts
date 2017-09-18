import { ExtensionContext } from 'vscode';
import {
  registerOnWillSaveTextDocument,
  registerTextEditorCommand,
  registerDocumentFormattingEditProvider
} from './subscriptions';

export function activate(context: ExtensionContext) {
  context.subscriptions.push(registerOnWillSaveTextDocument());
  context.subscriptions.push(registerTextEditorCommand());
  context.subscriptions.push(registerDocumentFormattingEditProvider(context));
}
