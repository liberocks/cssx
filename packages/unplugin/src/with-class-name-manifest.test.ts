import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

import { withClassNameManifest } from './with-class-name-manifest';

it('serializes independent allocations and restores the manifest between transforms', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-'));
  const path = join(root, 'state', 'classes.json');
  try {
    const [first, second] = await Promise.all([
      withClassNameManifest(path, {}, async (allocator) => {
        await new Promise((resolve) => setTimeout(resolve, 15));
        return allocator.allocate(['first-style', 'shared-style']);
      }),
      withClassNameManifest(path, {}, async (allocator) => allocator.allocate(['second-style', 'shared-style'])),
    ]);
    expect(first.get('shared-style')).toBe(second.get('shared-style'));
    expect(first.get('first-style')).not.toBe(second.get('second-style'));

    const snapshot = JSON.parse(await readFile(path, 'utf8')) as { assignments: readonly (readonly string[])[] };
    expect(snapshot.assignments).toHaveLength(3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('fails clearly when the persisted naming settings change', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-options-'));
  const path = join(root, 'classes.json');
  try {
    await withClassNameManifest(path, { prefix: 'a' }, async () => undefined);
    await expect(withClassNameManifest(path, { prefix: 'b' }, async () => undefined)).rejects.toThrow(
      'manifest options do not match',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('fails clearly for corrupt manifest data', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-corrupt-'));
  const path = join(root, 'classes.json');
  try {
    await writeFile(path, '{invalid', 'utf8');
    await expect(withClassNameManifest(path, {}, async () => undefined)).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
