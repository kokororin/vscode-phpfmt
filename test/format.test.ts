import * as assert from 'assert';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  workspace as Workspace,
  window as Window,
  commands as Commands
} from 'vscode';

function hasFormat(file: string): Thenable<void> {
  const absPath: string = path.join(Workspace.rootPath!, file);

  return Workspace.openTextDocument(absPath).then(doc => {
    return Window.showTextDocument(doc).then(() =>
      Commands.executeCommand('editor.action.formatDocument').then(
        () => {
          const stdout: Buffer = execSync(
            `php ${path.join(
              Workspace.rootPath!,
              `/../phpf.phar --psr2 --dry-run -o=- ${absPath}`
            )}`
          );
          const phpfmtFormatted: string = stdout.toString();
          assert.equal(doc.getText(), phpfmtFormatted);
        },
        e => console.error(e)
      )
    );
  });
}

suite('Test format', () => {
  test('it formats successfully', () => hasFormat('ugly.php'));
});
