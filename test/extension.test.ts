import * as assert from 'assert';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  workspace as Workspace,
  window as Window,
  commands as Commands,
  extensions as Extensions,
  Extension
} from 'vscode';
import * as pkg from 'pjson';

suite('PHPFmt Test', () => {
  test('extension should be present', () => {
    assert.ok(Extensions.getExtension(`${pkg.author}.${pkg.name}`));
  });

  test('can activate', () => {
    const extension = Extensions.getExtension(
      `${pkg.author}.${pkg.name}`
    ) as Extension<any>;
    return extension.activate().then(() => {
      assert.ok(true);
    });
  });

  test('can format with command', () => {
    const filePath: string = path.join(Workspace.rootPath!, 'ugly.php');
    return Workspace.openTextDocument(filePath).then(doc => {
      return Window.showTextDocument(doc).then(() =>
        Commands.executeCommand('editor.action.formatDocument').then(
          () => {
            const stdout: Buffer = execSync(
              `php ${path.join(
                Workspace.rootPath!,
                `/../phpf.phar --psr2 --dry-run -o=- ${filePath}`
              )}`
            );
            const phpfmtFormatted: string = stdout.toString();
            assert.equal(doc.getText(), phpfmtFormatted);
          },
          e => console.error(e)
        )
      );
    });
  });
});
