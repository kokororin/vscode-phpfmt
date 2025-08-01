import antfu from '@antfu/eslint-config';
import configPrettier from 'eslint-config-prettier';
import pluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default antfu(
  {
    imports: {
      overrides: {
        'import/consistent-type-specifier-style': 'off'
      }
    },
    jsonc: false,
    ignores: ['src/meta.ts']
  },
  configPrettier,
  pluginPrettierRecommended
);
