import path from 'path';
import fs from 'fs';
import os from 'os';
import Transformations from '../src/Transformations';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg: any = require('pjson');

const readmePath: string = path.join(__dirname, '/../README.md');

const configuration: any = pkg.contributes.configuration;

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

let readmeContent = fs.readFileSync(readmePath).toString();
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
      new Transformations('php')
        .getTransformations()
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

fs.writeFileSync(readmePath, readmeContent);
