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
import PHPFmt from '../src/PHPFmt';

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
    const filePath: string = path.join(Workspace.rootPath!, 'ugly.php');
    return Workspace.openTextDocument(filePath).then(doc => {
      return Window.showTextDocument(doc).then(() =>
        Commands.executeCommand('editor.action.formatDocument').then(
          () => {
            const stdout: Buffer = execSync(
              `php ${path.join(
                Workspace.rootPath!,
                '/../',
                PHPFmt.pharRelPath
              )} --psr2 --indent_with_space=4 --dry-run -o=- ${filePath}`
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
