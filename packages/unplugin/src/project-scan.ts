import { readFile, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { createClassNameAllocator } from '@cssxio/compiler';
import type { CssxPluginOptions } from './options';
import type { CssxSourceModule } from './stylesheet';
import { transformCssxModule } from './transform';

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
 * Collects CSSX source metadata directly from a project tree.
 *
 * Source-addressed classes make this safe across independent webpack processes:
 * every process derives the same composite selector from the same project-relative
 * file name and source location.
 *
 * @param root Project root to scan.
 * @param options CSSX transform options.
 * @returns CSSX metadata for every source file that imports the CSSX runtime.
 */
export async function scanProjectCssxSourceModules(
  root: string,
  options: CssxPluginOptions,
): Promise<readonly CssxSourceModule[]> {
  const files = await sourceFiles(root);
  const allocator = createClassNameAllocator(options.className);
  const modules: CssxSourceModule[] = [];
  for (const fileName of files) {
    const code = await readFile(fileName, 'utf8');
    const transformed = await transformCssxModule(code, fileName, {
      ...options,
      classNameAllocator: allocator,
      stableClassNames: true,
      stableClassNameFileName: relative(root, fileName).replaceAll(sep, '/'),
    });
    if (!transformed) {
      continue;
    }
    modules.push({
      id: fileName,
      candidates: transformed.candidates,
      composites: transformed.composites,
      atomicClasses: transformed.atomicClasses,
      origins: transformed.origins,
    });
  }
  return modules;
}

/** Finds JavaScript-family source files while excluding generated and dependency trees. */
async function sourceFiles(root: string): Promise<readonly string[]> {
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
