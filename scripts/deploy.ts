import path from 'path';
import fs from 'fs';
import os from 'os';
import phpfmt from 'phpfmt';
import AdmZip from 'adm-zip';
import md5 from 'md5';
import * as semver from 'semver';
import { simpleGit } from 'simple-git';
import { downloadFile } from '../src/utils';

const pkgJsonPath = path.join(__dirname, '../package.json');
const changelogPath = path.join(__dirname, '../CHANGELOG.md');

void (async () => {
  try {
    const pkg = JSON.parse(String(await fs.promises.readFile(pkgJsonPath)));
    const currentVersion = pkg.version;

    const pharUrl = phpfmt.v2.installUrl;
    console.log(`Download url: ${pharUrl}`);

    const tmpDir = path.join(os.tmpdir(), 'vscode-phpfmt');
    // eslint-disable-next-line no-sync
    if (!fs.existsSync(tmpDir)) {
      await fs.promises.mkdir(tmpDir);
    }
    const currentVsixPath = path.join(tmpDir, `${currentVersion}.vsix`);
    const latestPharPath = path.join(tmpDir, phpfmt.v2.pharName);

    console.log('Downloading vsix...');
    await downloadFile(
      `https://kokororin.gallery.vsassets.io/_apis/public/gallery/publisher/kokororin/extension/vscode-phpfmt/${currentVersion}/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage`,
      currentVsixPath
    );

    const stats = await fs.promises.stat(currentVsixPath);
    if (stats.size < 10000) {
      console.log('Download vsix failed');
      return;
    }

    const zip = new AdmZip(currentVsixPath);
    const zipEntries = zip.getEntries();
    const entry = zipEntries.find(
      o =>
        o.entryName === `extension/node_modules/phpfmt/v2/${phpfmt.v2.pharName}`
    );
    const currentPharData = String(entry?.getData());
    const currentMd5 = md5(currentPharData);
    console.log(`Current md5: ${currentMd5}`);

    console.log('Downloading latest phar...');
    await downloadFile(pharUrl, latestPharPath);
    const latestPharData = String(await fs.promises.readFile(latestPharPath));
    const latestMd5 = md5(latestPharData);
    console.log(`Latest md5: ${latestMd5}`);

    if (currentMd5 === latestMd5) {
      console.log('Md5 is same');
      return;
    }

    const newVersion = semver.inc(currentVersion, 'patch');
    console.log(`New version: ${newVersion}`);

    let changelogData = String(await fs.promises.readFile(changelogPath));
    changelogData = `### ${newVersion}

- Upgrade ${phpfmt.v2.pharName} (${latestMd5})

${changelogData}`;
    await fs.promises.writeFile(changelogPath, changelogData);

    pkg.version = newVersion;
    await fs.promises.writeFile(
      pkgJsonPath,
      JSON.stringify(pkg, null, 2) + os.EOL
    );

    await fs.promises.writeFile(phpfmt.v2.pharPath, latestPharData);

    const git = simpleGit({
      config: [
        'credential.https://github.com/.helper="! f() { echo username=x-access-token; echo password=$GITHUB_TOKEN; };f"'
      ]
    });
    await git
      .addConfig('user.name', 'github-actions[bot]')
      .addConfig(
        'user.email',
        '41898282+github-actions[bot]@users.noreply.github.com'
      )
      .add('.')
      .commit(`release: ${newVersion}`)
      .addTag(`v${newVersion}`)
      .push()
      .pushTags();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();