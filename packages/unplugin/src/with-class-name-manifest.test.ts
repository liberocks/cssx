import * as fileSystem from 'node:fs/promises';
import { mkdir, mkdtemp, readFile, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';

import { withClassNameManifest } from './with-class-name-manifest';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, open: vi.fn(actual.open), readFile: vi.fn(actual.readFile), rm: vi.fn(actual.rm) };
});

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

it('removes abandoned locks and waits for a live compiler lock to clear', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-locks-'));
  const path = join(root, 'classes.json');
  const lockPath = `${path}.lock`;
  const staleDate = new Date(Date.now() - 10 * 60_000);
  try {
    await writeFile(lockPath, '2147483647\n0\n');
    await utimes(lockPath, staleDate, staleDate);
    const allocator = await withClassNameManifest(path, {}, async (state) => state);
    expect(allocator.allocate(['after-stale-lock']).size).toBe(1);

    await writeFile(lockPath, `${process.pid}\n0\n`);
    await utimes(lockPath, staleDate, staleDate);
    const removeLiveLock = new Promise<void>((resolve) => setTimeout(() => void rm(lockPath).then(resolve), 45));
    const result = await withClassNameManifest(path, {}, async (state) => state.allocate(['after-live-lock']));
    await removeLiveLock;
    expect(result.size).toBe(1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('removes a stale lock whose owner record is invalid', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-invalid-owner-'));
  const path = join(root, 'classes.json');
  const lockPath = `${path}.lock`;
  const staleDate = new Date(Date.now() - 10 * 60_000);
  try {
    await writeFile(lockPath, 'not-a-process-id\n');
    await utimes(lockPath, staleDate, staleDate);
    const result = await withClassNameManifest(path, {}, async (allocator) =>
      allocator.allocate(['valid-after-stale']),
    );

    expect(result.size).toBe(1);
    await expect(readFile(lockPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('surfaces filesystem errors that prevent creation of the manifest lock', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-lock-error-'));
  const notDirectory = join(root, 'file');
  try {
    await writeFile(notDirectory, 'not a directory');

    await expect(
      withClassNameManifest(join(notDirectory, 'nested', 'classes.json'), {}, async () => undefined),
    ).rejects.toMatchObject({ code: 'ENOTDIR' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('waits for a stale lock when checking its owner fails for permission reasons', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-owner-permission-'));
  const path = join(root, 'classes.json');
  const lockPath = `${path}.lock`;
  const staleDate = new Date(Date.now() - 10 * 60_000);
  const kill = vi.spyOn(process, 'kill').mockImplementation(() => {
    throw Object.assign(new Error('permission denied'), { code: 'EPERM' });
  });
  try {
    await writeFile(lockPath, `${process.pid}\n`);
    await utimes(lockPath, staleDate, staleDate);
    const removeLock = new Promise<void>((resolve) => setTimeout(() => void rm(lockPath).then(resolve), 45));
    const result = await withClassNameManifest(path, {}, async (allocator) =>
      allocator.allocate(['after-permission-error']),
    );
    await removeLock;

    expect(result.size).toBe(1);
  } finally {
    kill.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

it('waits briefly when a competing compiler lock cannot be read', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-unreadable-lock-'));
  const path = join(root, 'classes.json');
  const lockPath = `${path}.lock`;
  const read = vi.spyOn(fileSystem, 'readFile');
  try {
    await writeFile(lockPath, `${process.pid}\n`);
    read.mockRejectedValueOnce(Object.assign(new Error('lock file is temporarily unavailable'), { code: 'EPERM' }));
    const removeLock = new Promise<void>((resolve) => setTimeout(() => void rm(lockPath).then(resolve), 45));
    const result = await withClassNameManifest(path, {}, async (allocator) => allocator.allocate(['after-lock-read']));
    await removeLock;

    expect(result.size).toBe(1);
  } finally {
    read.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

it('removes a recently created lock when its owner process has exited', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-dead-owner-'));
  const path = join(root, 'classes.json');
  const lockPath = `${path}.lock`;
  const kill = vi.spyOn(process, 'kill').mockImplementationOnce(() => {
    throw Object.assign(new Error('no such process'), { code: 'ESRCH' });
  });
  try {
    await writeFile(lockPath, `${process.pid}\n`);
    const result = await withClassNameManifest(path, {}, async (allocator) => allocator.allocate(['recovered']));

    expect(result.size).toBe(1);
    await expect(readFile(lockPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    kill.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

it('times out when a class-name lock remains occupied', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-timeout-'));
  const path = join(root, 'classes.json');
  const now = vi.spyOn(Date, 'now');
  try {
    await writeFile(`${path}.lock`, `${process.pid}\n0\n`);
    now.mockReturnValueOnce(0).mockReturnValueOnce(1).mockReturnValueOnce(300_001);
    await expect(withClassNameManifest(path, {}, async () => undefined)).rejects.toThrow('Timed out waiting');
  } finally {
    now.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

it('releases its lock when the compiler transform fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-transform-error-'));
  const path = join(root, 'classes.json');
  try {
    await expect(
      withClassNameManifest(path, {}, async () => {
        throw new Error('transform failed');
      }),
    ).rejects.toThrow('transform failed');
    await expect(readFile(`${path}.lock`, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('removes a newly created lock when recording its owner fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-owner-write-error-'));
  const path = join(root, 'classes.json');
  const originalOpen = (await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')).open;
  const failure = new Error('lock owner write failed');
  vi.mocked(fileSystem.open).mockImplementationOnce((async (...args: Parameters<typeof fileSystem.open>) => {
    const handle = await originalOpen(...args);
    return new Proxy(handle, {
      get(target, property) {
        if (property === 'writeFile') {
          return async () => {
            throw failure;
          };
        }
        const value: unknown = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  }) as never);
  try {
    await expect(withClassNameManifest(path, {}, async () => undefined)).rejects.toBe(failure);
    await expect(readFile(`${path}.lock`, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('surfaces unexpected errors when opening the manifest lock', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-open-error-'));
  const failure = Object.assign(new Error('lock open failed'), { code: 'EACCES' });
  try {
    vi.mocked(fileSystem.open).mockRejectedValueOnce(failure);
    await expect(withClassNameManifest(join(root, 'classes.json'), {}, async () => undefined)).rejects.toBe(failure);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('waits briefly for a newly created lock whose owner has not been written yet', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-empty-lock-'));
  const path = join(root, 'classes.json');
  const lockPath = `${path}.lock`;
  try {
    await writeFile(lockPath, 'pending\n');
    const removeLock = new Promise<void>((resolve) => setTimeout(() => void rm(lockPath).then(resolve), 25));
    const result = await withClassNameManifest(path, {}, async (allocator) => allocator.allocate(['after-empty-lock']));
    await removeLock;

    expect(result.size).toBe(1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('removes an expired ownerless lock', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-expired-lock-'));
  const path = join(root, 'classes.json');
  const lockPath = `${path}.lock`;
  const staleDate = new Date(Date.now() - 10 * 60_000);
  try {
    await writeFile(lockPath, 'owner unavailable\n');
    await utimes(lockPath, staleDate, staleDate);
    const result = await withClassNameManifest(path, {}, async (allocator) => allocator.allocate(['after-expiry']));

    expect(result.size).toBe(1);
    await expect(readFile(lockPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('removes a temporary manifest when replacing the target fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-rename-error-'));
  const path = join(root, 'classes.json');
  try {
    await expect(
      withClassNameManifest(path, {}, async () => {
        await mkdir(path);
      }),
    ).rejects.toThrow();
    await expect(readdir(root)).resolves.toEqual(['classes.json']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('preserves the lock-owner write error when lock cleanup also fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-cleanup-error-'));
  const path = join(root, 'classes.json');
  const originalOpen = (await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')).open;
  const failure = new Error('lock owner write failed');
  vi.mocked(fileSystem.open).mockImplementationOnce((async (...args: Parameters<typeof originalOpen>) => {
    const handle = await originalOpen(...args);
    return new Proxy(handle, {
      get(target, property) {
        if (property === 'writeFile') {
          return async () => {
            throw failure;
          };
        }
        if (property === 'close') {
          return async () => {
            await target.close();
            throw new Error('handle close failed');
          };
        }
        const value: unknown = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  }) as never);
  try {
    vi.mocked(fileSystem.rm).mockRejectedValueOnce(new Error('lock removal failed'));
    await expect(withClassNameManifest(path, {}, async () => undefined)).rejects.toBe(failure);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('preserves a replacement error when temporary-file cleanup fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-class-manifest-temp-cleanup-error-'));
  const path = join(root, 'classes.json');
  try {
    vi.mocked(fileSystem.rm).mockRejectedValueOnce(new Error('temporary-file removal failed'));
    await expect(
      withClassNameManifest(path, {}, async () => {
        await mkdir(path);
      }),
    ).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
