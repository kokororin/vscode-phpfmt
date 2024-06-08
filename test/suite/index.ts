/* eslint-disable n/no-sync */
import * as path from 'node:path';
import Mocha from 'mocha';
import { sync as globSync } from 'fast-glob';

export function run(
  testsRoot: string,
  cb: (error: any, failures?: number) => void
): void {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd'
  });

  const files = globSync('**/**.test.js', { cwd: testsRoot });

  // Add files to the test suite
  files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

  try {
    // Run the mocha test
    mocha.run(failures => {
      cb(null, failures);
    });
  } catch (err) {
    console.error(err);
    cb(err);
  }
}
