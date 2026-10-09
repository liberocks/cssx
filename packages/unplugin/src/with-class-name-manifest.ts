import {
  createClassNameAllocator,
  restoreClassNameAllocator,
  snapshotClassNameAllocator,
  type ClassNameAllocator,
  type ClassNameAllocatorSnapshot,
  type ClassNameOptions,
} from '@cssxio/compiler';
import { mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/** Delay between attempts to acquire the inter-process manifest lock. */
const LOCK_RETRY_MS = 20;
/** Maximum time to wait for an active compiler to release the manifest lock. */
const LOCK_TIMEOUT_MS = 5 * 60_000;

/**
 * Runs a compiler transform as one persisted allocation transaction.
 *
 * @param fileName Path to the shared manifest.
 * @param options Effective naming options.
 * @param transform Work performed while holding the manifest lock.
 * @returns Transform output after saving any new assignments.
 */
export async function withClassNameManifest<T>(
  fileName: string,
  options: ClassNameOptions,
  transform: (allocator: ClassNameAllocator) => Promise<T>,
): Promise<T> {
  const path = resolve(fileName);
  const lockPath = `${path}.lock`;
  const started = Date.now();
  let lock: Awaited<ReturnType<typeof open>> | undefined;
  while (!lock) {
    try {
      await mkdir(dirname(path), { recursive: true });
      lock = await open(lockPath, 'wx');
      await lock.writeFile(`${process.pid}\n${Date.now()}\n`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
      if (await removeAbandonedLock(lockPath)) {
        continue;
      }
      if (Date.now() - started >= LOCK_TIMEOUT_MS) {
        throw new Error(`Timed out waiting for CSSX class-name manifest lock: ${lockPath}`);
      }
      await new Promise((resolvePromise) => setTimeout(resolvePromise, LOCK_RETRY_MS));
    }
  }
  try {
    const allocator = await readAllocator(path, options);
    const result = await transform(allocator);
    const snapshot = snapshotClassNameAllocator(allocator);
    const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    await rename(temporary, path);
    return result;
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
  }
}

/** Removes an aged lock only when its recorded owner process no longer exists. */
async function removeAbandonedLock(lockPath: string): Promise<boolean> {
  try {
    const info = await stat(lockPath);
    if (Date.now() - info.mtimeMs < LOCK_TIMEOUT_MS) {
      return false;
    }
    const [pidText] = (await readFile(lockPath, 'utf8')).split('\n');
    const pid = Number(pidText);
    if (Number.isSafeInteger(pid) && pid > 0) {
      try {
        process.kill(pid, 0);
        return false;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
          return false;
        }
      }
    }
    await rm(lockPath, { force: true });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/** Restores a compatible manifest or creates the first allocator snapshot. */
async function readAllocator(path: string, options: ClassNameOptions): Promise<ClassNameAllocator> {
  try {
    const snapshot = JSON.parse(await readFile(path, 'utf8')) as ClassNameAllocatorSnapshot;
    const expected = snapshotClassNameAllocator(createClassNameAllocator(options)).options;
    if (JSON.stringify(snapshot.options) !== JSON.stringify(expected)) {
      throw new Error('CSSX class-name manifest options do not match the active compiler options.');
    }
    return restoreClassNameAllocator(snapshot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return createClassNameAllocator(options);
    }
    throw error;
  }
}
