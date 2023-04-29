import assert from 'assert';
import path from 'path';
import { execSync } from 'child_process';
import {
  workspace as Workspace,
  window as Window,
  commands as Commands,
  extensions as Extensions,
  type Extension
} from 'vscode';
import phpfmt from 'use-phpfmt';
import pjson from 'pjson';

const pkg = pjson as any;

suite('PHPFmt Test', () => {
  const extension = Extensions.getExtension(
    `${pkg.author}.${pkg.name}`
  ) as Extension<any>;

  test('extension should be present', () => {
    assert.ok(extension);
  });

  test('can activate', () => {
    return extension.activate().then(() => {
      assert.ok(true);
    });
  });

  test('can format with command', () => {
    if (!Workspace.rootPath) {
      assert.fail();
    }

    const filePath: string = path.join(Workspace.rootPath, 'ugly.php');
    return Workspace.openTextDocument(filePath).then(doc => {
      return Window.showTextDocument(doc).then(() =>
        Commands.executeCommand('editor.action.formatDocument').then(
          () => {
            const stdout: Buffer = execSync(
              `php "${phpfmt.pharPath}" --psr2 --indent_with_space=4 --dry-run -o=- ${filePath}`
            );
            const phpfmtFormatted: string = stdout.toString();
            assert.equal(doc.getText(), phpfmtFormatted);
          },
          err => {
            console.error(err);
          }
        )
      );
    });
  });

  test('should register commands', () => {
    return Commands.getCommands(true).then(commands => {
      const foundCommands = commands.filter(value =>
        value.startsWith('phpfmt.')
      );

      assert.equal(foundCommands.length, pkg.contributes.commands.length);
    });
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
