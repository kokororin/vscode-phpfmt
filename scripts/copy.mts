import path from 'node:path';
import fs from 'node:fs/promises';
import phpfmt from 'phpfmt';
import { dirname } from 'dirname-filename-esm';

// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = dirname(import.meta);

try {
  const pkgPath = path.join(__dirname, '..');
  const distPath = path.join(pkgPath, 'dist');
  const destPath = path.join(distPath, phpfmt.v2.pharName);
  const pharContent = await fs.readFile(phpfmt.v2.pharPath);
  await fs.writeFile(destPath, pharContent);
} catch (err) {
  console.error(err);
  process.exit(1);
}
