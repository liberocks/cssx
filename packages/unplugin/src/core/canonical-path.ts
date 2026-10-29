import { realpathSync } from 'node:fs';
import { realpath } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

/**
 * Resolves a source path through symlinks when the file exists.
 *
 * @param path Source file path to canonicalize.
 * @returns The real path, or an absolute path when the file no longer exists.
 */
export async function canonicalPath(path: string): Promise<string> {
  return realpath(path).catch(() => resolve(path));
}

/** Resolves an existing path through symlinks, with an absolute-path fallback. */
export function canonicalPathSync(path: string): string {
  const absolutePath = resolve(path);
  try {
    return realpathSync.native(absolutePath);
  } catch {
    let parent = dirname(absolutePath);
    let suffix = basename(absolutePath);
    while (true) {
      try {
        return resolve(realpathSync.native(parent), suffix);
      } catch {
        const nextParent = dirname(parent);
        /* v8 ignore next -- The filesystem root is present on every supported host. */
        if (nextParent === parent) {
          return absolutePath;
        }
        suffix = join(basename(parent), suffix);
        parent = nextParent;
      }
    }
  }
}
