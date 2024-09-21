/* eslint-disable n/no-sync */
/* eslint no-console: error */
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import phpfmt from 'phpfmt';
import AdmZip from 'adm-zip';
import md5 from 'md5';
import * as semver from 'semver';
import debug from 'debug';
import { simpleGit } from 'simple-git';
import { consola } from 'consola';
import { downloadFile, exec } from '../src/utils';

debug.enable('simple-git,simple-git:*');

const pkgJsonPath = path.join(__dirname, '../package.json');
const changelogPath = path.join(__dirname, '../CHANGELOG.md');

void (async () => {
  try {
    const pkg = JSON.parse(String(await fs.readFile(pkgJsonPath)));
    const currentVersion = pkg.version;

    const vsceBin = path.join(__dirname, '../node_modules/.bin/vsce');
    const { stdout: versionListOut } = await exec(
      `${vsceBin} show kokororin.vscode-phpfmt --json`
    );
    const versionList = JSON.parse(versionListOut);
    const latestVersion = versionList.versions[0].version;

    const pharUrl = phpfmt.v2.installUrl;
    const pharVersionUrl = phpfmt.v2.installUrl.replace(
      phpfmt.v2.pharName,
      'version.txt'
    );

    consola.info(`Download url: ${pharUrl}`);

    const tmpDir = path.join(os.tmpdir(), 'vscode-phpfmt');
    await fs.mkdir(tmpDir, { recursive: true });
    const currentVsixPath = path.join(tmpDir, `${latestVersion}.vsix`);
    const latestPharPath = path.join(tmpDir, phpfmt.v2.pharName);
    const latestPharVersionPath = path.join(
      tmpDir,
      `${phpfmt.v2.pharName}.version.txt`
    );

    consola.info('Downloading vsix...');
    await downloadFile(
      `https://kokororin.gallery.vsassets.io/_apis/public/gallery/publisher/kokororin/extension/vscode-phpfmt/${latestVersion}/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage`,
      currentVsixPath
    );

    const stats = await fs.stat(currentVsixPath);
    if (stats.size < 10000) {
      consola.error('Download vsix failed');
      return;
    }

    const zip = new AdmZip(currentVsixPath);
    const zipEntries = zip.getEntries();
    const entry = zipEntries.find(
      o => o.entryName === `extension/dist/${phpfmt.v2.pharName}`
    );
    if (entry == null) {
      consola.error('Not found phar in vsix');
      return;
    }

    const currentPharData = String(entry.getData());
    const currentMd5 = md5(currentPharData);
    consola.info(`Current md5: ${currentMd5}`);

    consola.info('Downloading latest phar...');
    await downloadFile(pharUrl, latestPharPath);
    await downloadFile(pharVersionUrl, latestPharVersionPath);
    const latestPharData = String(await fs.readFile(latestPharPath));
    const latestPharVersion = String(await fs.readFile(latestPharVersionPath));
    consola.info(`Latest phar version: ${latestPharVersion}`);

    const latestMd5 = md5(latestPharData);
    consola.info(`Latest md5: ${latestMd5}`);

    if (currentMd5 === latestMd5) {
      consola.info('Md5 is same');
      return;
    }

    const newVersion = semver.inc(currentVersion, 'patch');
    consola.info(`New version: ${newVersion}`);

    let changelogData = String(await fs.readFile(changelogPath));
    changelogData = `### ${newVersion}

- Upgrade ${phpfmt.v2.pharName} [(V${latestPharVersion})](https://github.com/driade/phpfmt8/releases/tag/v${latestPharVersion})

${changelogData}`;
    await fs.writeFile(changelogPath, changelogData);

    pkg.version = newVersion;
    await fs.writeFile(pkgJsonPath, JSON.stringify(pkg, null, 2) + os.EOL);

    await fs.writeFile(phpfmt.v2.pharPath, latestPharData);

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

    // Publish to NPM
    try {
      execSync('npm publish --ignore-scripts', {
        stdio: 'inherit',
        env: {
          NODE_AUTH_TOKEN: process.env.NODE_AUTH_TOKEN
        }
      });
    } catch (err) {
      consola.error(err);
    }

    // Publish to VSCE
    try {
      execSync(`vsce publish -p ${process.env.VSCE_TOKEN} --no-dependencies`, {
        stdio: 'inherit'
      });
    } catch (err) {
      consola.error(err);
    }

    // Publish to OVSX
    try {
      execSync(`ovsx publish -p ${process.env.OVSX_TOKEN} --no-dependencies`, {
        stdio: 'inherit'
      });
    } catch (err) {
      consola.error(err);
    }
  } catch (err) {
    consola.error(err);
    process.exit(1);
  }
})();
