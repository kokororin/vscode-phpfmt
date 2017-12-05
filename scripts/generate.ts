import * as path from 'path';
import * as fs from 'fs';

const pkg: any = require('pjson');

const readmeTpl: string = String(
  fs.readFileSync(path.join(__dirname, '/../README.tpl.md'))
);
const readmeOutPath: string = path.join(__dirname, '/../README.md');

const configuration: any = pkg.contributes.configuration;

let config: string = '';

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

  config += ' | \n';
}

fs.writeFileSync(readmeOutPath, readmeTpl.replace('%CONFIG%', config));
