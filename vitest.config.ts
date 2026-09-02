import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@cssxio/cssx': fromRoot('./packages/cssx/src/index.ts'),
      '@cssxio/react-native': fromRoot('./packages/react-native/src/index.ts'),
      '@cssxio/compiler': fromRoot('./packages/compiler/src/index.ts'),
      '@cssxio/babel-plugin': fromRoot('./packages/babel-plugin/src/index.ts'),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/*/src/**/*.{js,ts}'],
      exclude: ['**/*.d.ts'],
      thresholds: {
        100: true,
        perFile: true,
      },
    },
  },
});
