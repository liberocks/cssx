import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';

import { withClassNameManifest } from './with-class-name-manifest';

const statRace = vi.hoisted(() => ({ path: '', failNext: false, errorCode: 'ENOENT' }));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    stat: async (path: Parameters<typeof actual.stat>[0]) => {
      if (String(path) === statRace.path && statRace.failNext) {
        statRace.failNext = false;
        throw Object.assign(new Error('lock check failed'), { code: statRace.errorCode });
      }
      return actual.stat(path);
    },
  };
});

it('surfaces unexpected filesystem errors while checking an occupied lock', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-stat-error-'));
  const manifest = join(root, 'classes.json');
  const lockPath = `${manifest}.lock`;
  try {
    await writeFile(lockPath, `${process.pid}\n`);
    statRace.path = lockPath;
    statRace.errorCode = 'EACCES';
    statRace.failNext = true;

    await expect(withClassNameManifest(manifest, {}, async () => undefined)).rejects.toMatchObject({ code: 'EACCES' });
  } finally {
    statRace.path = '';
    statRace.failNext = false;
    statRace.errorCode = 'ENOENT';
    await rm(root, { recursive: true, force: true });
  }
});

it('retries acquisition when a competing compiler removes the lock before it is checked', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-race-'));
  const manifest = join(root, 'classes.json');
  const lockPath = `${manifest}.lock`;
  try {
    await writeFile(lockPath, `${process.pid}\n`);
    statRace.path = lockPath;
    statRace.failNext = true;
    const removeLock = new Promise<void>((resolve) => setTimeout(() => void rm(lockPath).then(resolve), 5));

    const result = await withClassNameManifest(manifest, {}, async (allocator) => allocator.allocate(['after-race']));
    await removeLock;

    expect(result.size).toBe(1);
    expect(statRace.failNext).toBe(false);
  } finally {
    statRace.path = '';
    statRace.failNext = false;
    await rm(root, { recursive: true, force: true });
  }
});
