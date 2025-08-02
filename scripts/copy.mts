import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { dirname } from 'dirname-filename-esm';
import phpfmt from 'phpfmt';

const __dirname = dirname(import.meta);

const pkgPath = path.join(__dirname, '..');
const distPath = path.join(pkgPath, 'dist');
const destPath = path.join(distPath, phpfmt.v2.pharName);

try {
  await fs.mkdir(distPath, { recursive: true });
  await fs.copyFile(phpfmt.v2.pharPath, destPath);
} catch (err) {
  console.error(err);
  process.exit(1);
}
