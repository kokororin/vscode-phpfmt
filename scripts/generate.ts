import path from 'path';
import fs from 'fs';
import os from 'os';
import phpfmt from 'use-phpfmt';
import { Transformation } from '../src/Transformation';

const pkgJsonPath = path.join(__dirname, '../package.json');
const readmePath: string = path.join(__dirname, '../README.md');

void (async () => {
  try {
    const pkg = JSON.parse(String(await fs.promises.readFile(pkgJsonPath)));
    const configuration = pkg.contributes.configuration;

    let config: string =
      '| Key | Type | Description | Default |' +
      os.EOL +
      '| -------- | ----------- | ----------- | ----------- |' +
      os.EOL;

    for (const configKey of Object.keys(configuration.properties)) {
      const configValue = configuration.properties[configKey];
      config += `| ${configKey} | `;

      if (typeof configValue.type === 'string') {
        config += `\`${configValue.type}\``;
      } else if (Array.isArray(configValue.type)) {
        config += `\`${configValue.type.join(' \\| ')}\``;
      }
      config += ` | ${configValue.description}`;

      if (typeof configValue.default === 'string') {
        config += ` | "${configValue.default}"`;
      } else if (typeof configValue.default === 'number') {
        config += ` | ${configValue.default}`;
      } else if (
        Array.isArray(configValue.default) ||
        typeof configValue.default === 'boolean'
      ) {
        config += ` | ${JSON.stringify(configValue.default)}`;
      } else {
        throw new Error('uncovered type');
      }

      config += ' | ' + os.EOL;
    }

    let readmeContent = String(await fs.promises.readFile(readmePath));
    readmeContent = readmeContent.replace(
      /<!-- Configuration START -->([\s\S]*)<!-- Configuration END -->/,
      () => {
        return (
          '<!-- Configuration START -->' +
          os.EOL +
          config +
          os.EOL +
          '<!-- Configuration END -->'
        );
      }
    );

    const transformation = new Transformation('php', phpfmt.pharPath);

    const transformations = await transformation.getTransformations();

    readmeContent = readmeContent.replace(
      /<!-- Transformations START -->([\s\S]*)<!-- Transformations END -->/,
      () => {
        return (
          '<!-- Transformations START -->' +
          os.EOL +
          '| Key | Description |' +
          os.EOL +
          '| -------- | ----------- |' +
          os.EOL +
          transformations
            .map(item => {
              let row = `| ${item.key} | `;
              row += item.description;
              row += ' |';
              return row;
            })
            .join(os.EOL) +
          os.EOL +
          '<!-- Transformations END -->'
        );
      }
    );
    const enums = transformations.map(item => item.key);
    const enumDescriptions = transformations.map(item => item.description);

    pkg.contributes.configuration.properties['phpfmt.passes'].items.enum =
      enums;
    pkg.contributes.configuration.properties[
      'phpfmt.passes'
    ].items.enumDescriptions = enumDescriptions;
    pkg.contributes.configuration.properties['phpfmt.exclude'].items.enum =
      enums;
    pkg.contributes.configuration.properties[
      'phpfmt.exclude'
    ].items.enumDescriptions = enumDescriptions;

    await fs.promises.writeFile(readmePath, readmeContent);
    await fs.promises.writeFile(pkgJsonPath, JSON.stringify(pkg, null, 2));
  } catch (err) {
    console.error(err);
  }
})();
