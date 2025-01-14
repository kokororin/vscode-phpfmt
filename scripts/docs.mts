/* eslint-disable n/no-sync */
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import phpfmt from 'phpfmt';
import { dirname } from 'dirname-filename-esm';
import { consola } from 'consola';
import { got } from 'got';
import JSON5 from 'json5';
import { markdownTable } from 'markdown-table';
import { $ } from 'execa';

// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = dirname(import.meta);

const pkgJsonPath = path.join(__dirname, '../package.json');
const readmePath: string = path.join(__dirname, '../README.md');

const pkg = JSON.parse(String(await fs.readFile(pkgJsonPath)));
const configuration = pkg.contributes.configuration;

try {
  // check php first
  await $`php -v`;

  consola.info('Downloading phpfmt.sublime-settings...');
  const phpfmtSettingsRaw = await got
    .get(
      'https://raw.githubusercontent.com/driade/phpfmt8/refs/heads/master/phpfmt.sublime-settings'
    )
    .text();
  // eslint-disable-next-line import/no-named-as-default-member
  const phpfmtSettings = JSON5.parse(phpfmtSettingsRaw);
  for (const [key, value] of Object.entries(phpfmtSettings)) {
    if (configuration.properties[`phpfmt.${key}`]) {
      configuration.properties[`phpfmt.${key}`].default = value;
    }
  }

  const configTable: string[][] = [['Key', 'Type', 'Description', 'Default']];

  for (const configKey of Object.keys(configuration.properties)) {
    const configValue = configuration.properties[configKey];
    const row: string[] = [configKey];

    if (typeof configValue.type === 'string') {
      row.push(`\`${configValue.type}\``);
    } else if (Array.isArray(configValue.type)) {
      row.push(`\`${configValue.type.join(' \\| ')}\``);
    }
    row.push(configValue.description);

    if (typeof configValue.default === 'string') {
      row.push(`"${configValue.default}"`);
    } else if (typeof configValue.default === 'number') {
      row.push(configValue.default);
    } else if (
      Array.isArray(configValue.default) ||
      typeof configValue.default === 'boolean'
    ) {
      row.push(JSON.stringify(configValue.default));
    } else {
      throw new Error('uncovered type');
    }
    configTable.push(row);
  }

  let readmeContent = String(await fs.readFile(readmePath));
  readmeContent = readmeContent.replace(
    /<!-- Configuration START -->([\s\S]*)<!-- Configuration END -->/,
    () => {
      return (
        '<!-- Configuration START -->' +
        os.EOL +
        markdownTable(configTable, { alignDelimiters: false }) +
        os.EOL +
        '<!-- Configuration END -->'
      );
    }
  );

  const { Transformation } = await import('../src/Transformation');
  const transformation = new Transformation('php', phpfmt.v2);

  consola.info('Generating transformations and passes...');
  const transformations = await transformation.getTransformations();
  const transformationTable: string[][] = [
    ['Key', 'Description'],
    ...transformations.map(o => [o.key, o.description])
  ];

  readmeContent = readmeContent.replace(
    /<!-- Transformations START -->([\s\S]*)<!-- Transformations END -->/,
    () => {
      return (
        '<!-- Transformations START -->' +
        os.EOL +
        markdownTable(transformationTable, { alignDelimiters: false }) +
        os.EOL +
        '<!-- Transformations END -->'
      );
    }
  );

  const passes = transformation.getPasses();

  const enums = passes.map(pass => {
    const p = transformations.find(t => t.key === pass);
    return {
      enum: pass,
      description: p?.description ?? 'Core pass'
    };
  });

  pkg.contributes.configuration.properties['phpfmt.passes'].items.enum =
    enums.map(o => o.enum);
  pkg.contributes.configuration.properties[
    'phpfmt.passes'
  ].items.enumDescriptions = enums.map(o => o.description);
  pkg.contributes.configuration.properties['phpfmt.exclude'].items.enum =
    enums.map(o => o.enum);
  pkg.contributes.configuration.properties[
    'phpfmt.exclude'
  ].items.enumDescriptions = enums.map(o => o.description);

  consola.info('Generating docs...');
  await fs.writeFile(readmePath, readmeContent);
  consola.info('Updating package.json...');
  await fs.writeFile(pkgJsonPath, JSON.stringify(pkg, null, 2) + os.EOL);
} catch (err) {
  console.error(err);
  process.exit(1);
}
