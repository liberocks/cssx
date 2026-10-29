import { mkdtemp, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';

import { canonicalPath, canonicalPathSync } from './canonical-path';

it('returns real paths for existing files and absolute paths for missing files', async () => {
  expect(await canonicalPath('packages/unplugin/src/canonical-path.ts')).toBe(
    await canonicalPath(resolve('packages/unplugin/src/canonical-path.ts')),
  );
  expect(await canonicalPath('/not-a-real-cssx-source/module.ts')).toBe('/not-a-real-cssx-source/module.ts');
  expect(canonicalPathSync('packages/unplugin/src/canonical-path.ts')).toBe(
    canonicalPathSync(resolve('packages/unplugin/src/canonical-path.ts')),
  );
  expect(canonicalPathSync('/not-a-real-cssx-source/module.ts')).toBe('/not-a-real-cssx-source/module.ts');

  const temporaryRoot = await mkdtemp(join(tmpdir(), 'cssx-canonical-path-'));
  const realRoot = join(temporaryRoot, 'real');
  const aliasRoot = join(temporaryRoot, 'alias');
  try {
    await mkdir(realRoot);
    await symlink(realRoot, aliasRoot, 'dir');
    expect(canonicalPathSync(join(aliasRoot, 'removed.ts'))).toBe(join(canonicalPathSync(realRoot), 'removed.ts'));
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
