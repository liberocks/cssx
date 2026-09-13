import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@cssxio/cssx': fromRoot('./packages/cssx/src/index.ts'),
      '@cssxio/react-native': fromRoot('./packages/react-native/src/index.ts'),
      '@cssxio/html': fromRoot('./packages/html/src/index.ts'),
      '@cssxio/compiler': fromRoot('./packages/compiler/src/index.ts'),
      '@cssxio/babel-plugin': fromRoot('./packages/babel-plugin/src/index.ts'),
    },
  },
  test: {
    include: ['packages/*/src/**/*.test.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/*/src/**/*.{js,ts}'],
      // Astro is integration-tested by its own build; keep this TypeScript
      // coverage gate focused on compiler and adapter source.
      exclude: ['**/*.d.ts', '**/*.test.{js,ts}', '**/*-test-helpers.{js,ts}', 'packages/docs/**'],
      thresholds: {
        100: true,
        perFile: true,
      },
    },
  },
});
