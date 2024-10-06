import pluginUnicorn from 'eslint-plugin-unicorn';
import pluginImport from 'eslint-plugin-import';
import pluginNode from 'eslint-plugin-n';
import pluginPromise from 'eslint-plugin-promise';
import pluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { parser, plugin as pluginTs } from 'typescript-eslint';
import configLove from 'eslint-config-love';
import globals from 'globals';

export default [
  pluginPrettierRecommended,
  {
    files: ['**/*.ts', '**/*.mts', '**/*.js'],
    languageOptions: {
      parser,
      parserOptions: {
        project: ['tsconfig.json', 'tsconfig.eslint.json']
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.mocha
      }
    },
    plugins: {
      unicorn: pluginUnicorn,
      n: pluginNode,
      '@typescript-eslint': pluginTs,
      promise: pluginPromise,
      import: pluginImport
    },
    rules: {
      ...configLove.rules,
      ...pluginImport.flatConfigs.recommended.rules,
      'n/no-sync': 'error',
      'n/prefer-promises/fs': 'error',
      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto'
        }
      ],
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        {
          ignoreConditionalTests: true,
          ignoreMixedLogicalExpressions: true
        }
      ],
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowString: true,
          allowNumber: true,
          allowNullableObject: false,
          allowNullableBoolean: true,
          allowNullableString: true,
          allowNullableNumber: true,
          allowAny: true
        }
      ],
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/class-methods-use-this': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/init-declarations': 'off',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/catch-error-name': [
        'error',
        {
          name: 'err'
        }
      ]
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx']
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true
        }
      }
    }
  },
  {
    ignores: ['node_modules/**', 'dist/**', 'out/**']
  }
];
