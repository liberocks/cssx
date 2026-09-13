import { createClassNameAllocator } from '@cssxio/compiler';
import { readFile } from 'node:fs/promises';
import { relative, sep } from 'node:path';

import { findProjectSourceFiles } from './find-project-source-files';
import type { CssxPluginOptions } from './options';
import type { CssxSourceModule } from './stylesheet';
import { transformCssxModule } from './transform';

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
  const files = await findProjectSourceFiles(root);
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
