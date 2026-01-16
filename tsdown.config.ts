import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/extension.ts'],
  fixedExtension: false,
  format: ['cjs'],
  dts: false,
  noExternal: [/^((?!(vscode)).)*$/],
  external: ['vscode']
});
