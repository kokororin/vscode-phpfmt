import path from 'path';
import assert from 'assert';
import { runTests } from '@vscode/test-electron';
import findUp from 'find-up';

async function run(): Promise<void> {
  const pkgPath = await findUp('package.json', {
    cwd: __dirname
  });
  assert.ok(pkgPath);
  const extensionDevelopmentPath = path.dirname(pkgPath);
  const extensionTestsPath = path.join(__dirname, 'suite');
  const testWorkspace = path.join(extensionDevelopmentPath, 'testProject');

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [testWorkspace]
      .concat(['--skip-welcome'])
      .concat(['--disable-extensions'])
      .concat(['--skip-release-notes'])
      .concat(['--enable-proposed-api'])
  });
}

void run();
