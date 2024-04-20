import path from 'path';
import fs from 'fs/promises';
import phpfmt from 'phpfmt';

void (async () => {
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
})();
