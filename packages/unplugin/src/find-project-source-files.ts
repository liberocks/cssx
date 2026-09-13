import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/** Extensions CSSX can transform as source modules. */
const SOURCE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.cjs',
  '.cjsx',
  '.cts',
  '.ctsx',
  '.mjs',
  '.mjsx',
  '.mts',
  '.mtsx',
  '.astro',
]);

/** Generated and dependency directories excluded from project scanning. */
const IGNORED_DIRECTORIES = new Set(['.git', '.next', '.turbo', 'node_modules']);

/**
 * Finds JavaScript-family source files while excluding generated and dependency trees.
 *
 * @param root Project root to scan.
 * @returns Sorted absolute paths to CSSX-compatible source files.
 */
export async function findProjectSourceFiles(root: string): Promise<readonly string[]> {
  const files: string[] = [];
  const directories = [root];
  while (directories.length > 0) {
    const directory = directories.pop()!;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fileName = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) {
          directories.push(fileName);
        }
        continue;
      }
      if (entry.isFile() && SOURCE_EXTENSIONS.has(fileName.slice(fileName.lastIndexOf('.')))) {
        files.push(fileName);
      }
    }
  }
  return files.sort();
}
