import assert from 'assert';
import path from 'path';
import {
  workspace as Workspace,
  window as Window,
  commands as Commands,
  extensions as Extensions,
  type Extension
} from 'vscode';
import pjson from 'pjson';

const pkg = pjson as any;

suite('PHPFmt Test', () => {
  const extension = Extensions.getExtension(
    `${pkg.author}.${pkg.name}`
  ) as Extension<any>;

  test('extension should be present', () => {
    assert.ok(extension);
  });

  test('can activate', async () => {
    await extension.activate();
    assert.ok(true);
  });

  test('can format with command', async () => {
    if (Workspace.workspaceFolders == null) {
      assert.fail();
    }

    const filePath = path.join(
      Workspace.workspaceFolders[0].uri.fsPath,
      'ugly.php'
    );

    const doc = await Workspace.openTextDocument(filePath);
    await Window.showTextDocument(doc);

    const text = doc.getText();
    try {
      await Commands.executeCommand('editor.action.formatDocument');
      assert.notEqual(doc.getText(), text);
    } catch (err) {
      assert.fail('Failed to format doc');
    }
  });

  test('should register commands', async () => {
    const commands = await Commands.getCommands(true);
    const foundCommands = commands.filter(value => value.startsWith('phpfmt.'));
    assert.equal(foundCommands.length, pkg.contributes.commands.length);
  });

  test('should commands work', () => {
    const commands = pkg.contributes.commands as any[];
    commands
      .filter(value => !value.when)
      .forEach(command => {
        void Commands.executeCommand(command.command);
      });
  });
});
