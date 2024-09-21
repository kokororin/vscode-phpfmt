import assert from 'node:assert';
import fg from 'fast-glob';
import {
  workspace as Workspace,
  window as Window,
  commands as Commands,
  extensions as Extensions
} from 'vscode';
import readPkgUp from 'read-pkg-up';

const { packageJson: pkg } = readPkgUp.sync({ cwd: __dirname }) ?? {};
assert.ok(pkg != null, 'Failed to read package.json');

suite('PHPFmt Test', () => {
  const extension = Extensions.getExtension(`${pkg.author?.name}.${pkg.name}`);

  test('can activate', async () => {
    assert.ok(extension != null);
    await extension.activate();
  });

  test('can format with command', async () => {
    if (Workspace.workspaceFolders == null) {
      assert.fail();
    }

    const workspaceFolder = Workspace.workspaceFolders[0].uri.fsPath;
    const phpFiles = await fg(['**/*.php'], {
      cwd: workspaceFolder,
      absolute: true
    });

    for (const filePath of phpFiles) {
      const doc = await Workspace.openTextDocument(filePath);
      await Window.showTextDocument(doc);

      const text = doc.getText();
      try {
        await Commands.executeCommand('editor.action.formatDocument');
        assert.notEqual(doc.getText(), text);
      } catch (err) {
        assert.fail(`Failed to format doc: ${filePath}`);
      }
    }
  });

  test('should register commands', async () => {
    const commands = await Commands.getCommands(true);
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
        void Commands.executeCommand(command.command);
      });
  });
});
