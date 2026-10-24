import { expect, it } from 'vitest';

import { resolveNextLoaderPath } from './next-loader-path';

it('resolves the matching source, ESM, and CommonJS loader siblings', () => {
  expect(resolveNextLoaderPath('file:///workspace/cssx/packages/unplugin/src/next.ts')).toBe(
    '/workspace/cssx/packages/unplugin/src/next-loader.ts',
  );
  expect(resolveNextLoaderPath('file:///workspace/cssx/packages/unplugin/dist/next.js')).toBe(
    '/workspace/cssx/packages/unplugin/dist/next-loader.js',
  );
  expect(resolveNextLoaderPath('file:///workspace/cssx/packages/unplugin/dist/next.cjs', '/opt/cssx/dist')).toBe(
    '/opt/cssx/dist/next-loader.cjs',
  );
});
