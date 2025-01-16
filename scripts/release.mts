/* eslint-disable n/no-sync */
/* eslint no-console: error */
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import phpfmt from 'phpfmt';
import AdmZip from 'adm-zip';
import md5 from 'md5';
import * as semver from 'semver';
import debug from 'debug';
import { simpleGit } from 'simple-git';
import { consola } from 'consola';
import { dirname } from 'dirname-filename-esm';
import { got } from 'got';
import { Octokit } from '@octokit/rest';
import isInCi from 'is-in-ci';
import { $ } from 'execa';

// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = dirname(import.meta);

debug.enable('simple-git,simple-git:*');

const pkgJsonPath = path.join(__dirname, '../package.json');
const changelogPath = path.join(__dirname, '../CHANGELOG.md');

try {
  const pkg = JSON.parse(String(await fs.readFile(pkgJsonPath)));
  const currentVersion = pkg.version;

  const { stdout: versionListOut } = await $({
    preferLocal: true
  })`vsce show ${pkg.publisher}.${pkg.name} --json`;
  const versionList = JSON.parse(String(versionListOut));
  const latestVersion = versionList.versions[0].version;

  const pharUrl = phpfmt.v2.installUrl;
  const pharVersionUrl = phpfmt.v2.installUrl.replace(
    phpfmt.v2.pharName,
    'version.txt'
  );

  consola.info(`Download url: ${pharUrl}`);

  consola.info('Downloading vsix...');
  const currentVsix = await got(
    `https://${pkg.publisher}.gallery.vsassets.io/_apis/public/gallery/publisher/${pkg.publisher}/extension/${pkg.name}/${latestVersion}/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage`
  ).buffer();

  if (currentVsix.byteLength < 10000) {
    throw new Error('Download vsix failed');
  }

  const zip = new AdmZip(currentVsix);
  const zipEntries = zip.getEntries();
  const entry = zipEntries.find(
    o => o.entryName === `extension/dist/${phpfmt.v2.pharName}`
  );
  if (entry == null) {
    throw new Error('Not found phar in vsix');
  }

  const currentPharData = String(entry.getData());
  const currentMd5 = md5(currentPharData);
  consola.info(`Current md5: ${currentMd5}`);

  consola.info('Downloading latest phar...');
  const latestPharData = await got(pharUrl).text();
  const latestPharVersion = await got(pharVersionUrl).text();
  consola.info(`Latest phar version: ${latestPharVersion}`);

  const latestMd5 = md5(latestPharData);
  consola.info(`Latest md5: ${latestMd5}`);

  if (currentMd5 === latestMd5) {
    consola.info('Md5 is same');
    process.exit(0);
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

  if (!isInCi) {
    consola.warn('Not in CI, skip git push');
    process.exit(0);
  }

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

  if (process.env.GITHUB_TOKEN) {
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
    try {
      await octokit.rest.repos.createRelease({
        owner: pkg.author,
        repo: pkg.name,
        tag_name: `v${newVersion}`,
        body: `Please refer to [CHANGELOG.md](https://github.com/${pkg.author}/${pkg.name}/blob/master/CHANGELOG.md) for details.`,
        draft: false,
        prerelease: false
      });
    } catch (err) {
      consola.error(err);
    }
  }

  if (process.env.NODE_AUTH_TOKEN) {
    // Publish to NPM
    try {
      await $({
        stdio: 'inherit',
        env: {
          NODE_AUTH_TOKEN: process.env.NODE_AUTH_TOKEN
        }
      })`npm publish --ignore-scripts`;
    } catch (err) {
      consola.error(err);
    }
  }

  if (process.env.VSCE_TOKEN) {
    // Publish to VSCE
    try {
      await $({
        stdio: 'inherit',
        preferLocal: true
      })`vsce publish -p ${process.env.VSCE_TOKEN} --no-dependencies`;
    } catch (err) {
      consola.error(err);
    }
  }

  if (process.env.OVSX_TOKEN) {
    // Publish to OVSX
    try {
      await $({
        stdio: 'inherit',
        preferLocal: true
      })`ovsx publish -p ${process.env.OVSX_TOKEN} --no-dependencies`;
    } catch (err) {
      consola.error(err);
    }
  }
} catch (err) {
  consola.error(err);
  process.exit(1);
}
