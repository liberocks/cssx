import { resolve } from 'node:path';
import { expect, it } from 'vitest';

import { canonicalPath } from './canonical-path';

it('returns real paths for existing files and absolute paths for missing files', async () => {
  expect(await canonicalPath('packages/unplugin/src/canonical-path.ts')).toBe(
    await canonicalPath(resolve('packages/unplugin/src/canonical-path.ts')),
  );
  expect(await canonicalPath('/not-a-real-cssx-source/module.ts')).toBe('/not-a-real-cssx-source/module.ts');
});
