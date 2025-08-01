import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { dirname } from 'dirname-filename-esm';
import phpfmt from 'phpfmt';

const __dirname = dirname(import.meta);

try {
  const pkgPath = path.join(__dirname, '..');
  const distPath = path.join(pkgPath, 'dist');
  const destPath = path.join(distPath, phpfmt.v2.pharName);
  const pharContent = await fs.readFile(phpfmt.v2.pharPath, 'binary');
  await fs.writeFile(destPath, pharContent);
} catch (err) {
  console.error(err);
  process.exit(1);
}
