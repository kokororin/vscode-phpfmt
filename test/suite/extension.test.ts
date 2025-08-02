import assert from 'node:assert';
import readPkgUp from 'read-pkg-up';
import { glob } from 'tinyglobby';
import * as vscode from 'vscode';

const { packageJson: pkg } = readPkgUp.sync({ cwd: __dirname }) ?? {};
assert.ok(pkg != null, 'Failed to read package.json');

suite('PHPFmt Test', () => {
  const extension = vscode.extensions.getExtension(
    `${pkg.author?.name}.${pkg.name}`
  );

  test('can activate', async () => {
    assert.ok(extension != null);
    await extension.activate();
  });

  test('can format with command', async () => {
    if (vscode.workspace.workspaceFolders == null) {
      assert.fail();
    }

    const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const phpFiles = await glob(['**/*.php'], {
      cwd: workspaceFolder,
      absolute: true
    });

    for (const filePath of phpFiles) {
      const doc = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(doc);

      const text = doc.getText();
      try {
        await vscode.commands.executeCommand('editor.action.formatDocument');
        assert.notEqual(doc.getText(), text);
      } catch {
        assert.fail(`Failed to format doc: ${filePath}`);
      }
    }
  });

  test('should register commands', async () => {
    const commands = await vscode.commands.getCommands(true);
    const foundCommands = commands.filter(value => value.startsWith('phpfmt.'));
    assert.equal(foundCommands.length, pkg.contributes.commands.length);
  });

  test('should commands work', () => {
    const commands = pkg.contributes.commands as Array<{
      command: string;
      title: string;
      when?: string;
    }>;
    commands
      .filter(value => !value.when)
      .forEach(command => {
        void vscode.commands.executeCommand(command.command);
      });
  });
});
