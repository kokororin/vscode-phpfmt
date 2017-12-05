import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';

const codeHomeDir = path.join(os.homedir(), '.vscode');
const codeHomeBakDir = path.join(os.homedir(), '.vscode-bak');

switch (process.env.PHPFMT_TEST_HOOK) {
  case 'backup':
    if (fs.existsSync(codeHomeDir)) {
      fs.moveSync(codeHomeDir, codeHomeBakDir);
      console.log('backup OK');
    }
    break;
  case 'restore':
    if (fs.existsSync(codeHomeBakDir)) {
      fs.moveSync(codeHomeBakDir, codeHomeDir, { overwrite: true });
      console.log('restore OK');
    }
    break;
}
