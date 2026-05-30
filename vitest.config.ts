import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@cssxio/cssx': fromRoot('./packages/cssx/src/index.ts'),
      '@cssxio/compiler': fromRoot('./packages/compiler/src/index.ts'),
      '@cssxio/babel-plugin': fromRoot('./packages/babel-plugin/src/index.ts'),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.d.ts'],
      thresholds: {
        statements: 85,
        branches: 75,
        functions: 95,
        lines: 90,
      },
    },
  },
});
