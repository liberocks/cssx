import { realpath } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Resolves a source path through symlinks when the file exists.
 *
 * @param path Source file path to canonicalize.
 * @returns The real path, or an absolute path when the file no longer exists.
 */
export async function canonicalPath(path: string): Promise<string> {
  return realpath(path).catch(() => resolve(path));
}
