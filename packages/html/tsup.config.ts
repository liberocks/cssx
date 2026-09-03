import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    minify: true,
    shims: true,
    clean: true,
  },
  {
    entry: { cssx: 'src/cdn.ts' },
    format: ['iife'],
    minify: true,
    globalName: 'CSSX',
    clean: false,
  },
]);
