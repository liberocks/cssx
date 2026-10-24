import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const intellisenseCoverageExclusions =
  process.env.CSSX_INTELLISENSE_COVERAGE === '1'
    ? []
    : [
        // V8 coverage does not merge counters for CJS modules loaded by both require and ESM workers.
        // These IntelliSense modules receive separate strict coverage runs from the package's test files.
        'packages/intellisense/src/catalog-documentation.js',
        'packages/intellisense/src/catalog-entries.js',
        'packages/intellisense/src/color-utils.js',
        'packages/intellisense/src/create-completion-item.js',
        'packages/intellisense/src/is-cssx-string.js',
        'packages/intellisense/src/provide-color.js',
        'packages/intellisense/src/provide-completion-items.js',
      ];

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
      exclude: ['**/*.d.ts', '**/*.test.{js,ts}', 'packages/docs/**', ...intellisenseCoverageExclusions],
      thresholds: {
        100: true,
        perFile: true,
      },
    },
  },
});
