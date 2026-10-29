import { readdir } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

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
  '.mdx',
  '.md',
]);

/** Generated and dependency directories excluded from project scanning. */
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.next',
  '.open-next',
  '.output',
  '.turbo',
  '.vercel',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'out',
  'storybook-static',
]);

/** Returns whether a source path is under generated output or a dependency tree. */
export function isIgnoredProjectSourcePath(fileName: string, additionalRoots: readonly string[] = []): boolean {
  const absoluteFileName = resolve(fileName);
  const allowedRoot = additionalRoots
    .map((root) => resolve(root))
    .find((root) => {
      const pathFromRoot = relative(root, absoluteFileName);
      return (
        pathFromRoot === '' ||
        (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== '..' && !isAbsolute(pathFromRoot))
      );
    });
  const pathFromRoot = allowedRoot ? relative(allowedRoot, absoluteFileName) : absoluteFileName;
  return pathFromRoot.split(sep).some((segment) => IGNORED_DIRECTORIES.has(segment));
}

/**
 * Finds JavaScript-family source files while excluding generated and dependency trees.
 *
 * @param root Project root to scan.
 * @returns Sorted absolute paths to CSSX-compatible source files.
 */
export async function findProjectSourceFiles(
  root: string,
  additionalRoots: readonly string[] = [],
): Promise<readonly string[]> {
  const files: string[] = [];
  const directories = [root, ...additionalRoots];
  const visitedDirectories = new Set<string>();
  while (directories.length > 0) {
    const directory = directories.pop()!;
    const normalizedDirectory = resolve(directory);
    if (visitedDirectories.has(normalizedDirectory)) {
      continue;
    }
    visitedDirectories.add(normalizedDirectory);
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
