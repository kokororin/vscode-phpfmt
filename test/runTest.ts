import path from 'node:path';
import assert from 'node:assert';
import { runTests } from '@vscode/test-electron';
import readPkgUp from 'read-pkg-up';

async function run(): Promise<void> {
  const { path: pkgPath } = readPkgUp.sync({ cwd: __dirname }) ?? {};

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
