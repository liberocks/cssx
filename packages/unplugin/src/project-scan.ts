import { createClassNameAllocator } from '@cssxio/compiler';
import { readFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

import { findProjectSourceFiles } from './find-project-source-files';
import { compileNextMdx } from './next-mdx';
import type { CssxPluginOptions } from './options';
import { effectiveClassNameOptions } from './options';
import type { CssxSourceModule } from './stylesheet';
import { transformCssxModule } from './transform';
import { withClassNameManifest } from './with-class-name-manifest';

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
  const files = await findProjectSourceFiles(
    root,
    options.sourceRoots?.map((path) => resolve(root, path)),
  );
  const transformOptions = { ...options };
  delete transformOptions.coordination;
  delete transformOptions.manifestPath;
  delete transformOptions.classNameAllocator;
  const collect = async (allocator: import('@cssxio/compiler').ClassNameAllocator) => {
    const modules: CssxSourceModule[] = [];
    for (const fileName of files) {
      const source = await readFile(fileName, 'utf8');
      const isMdx = /\.(?:md|mdx)$/i.test(fileName);
      if (isMdx && !source.includes(options.importSource ?? '@cssxio/cssx')) {
        continue;
      }
      const code = isMdx ? await compileNextMdx(source, root, options.mdx) : source;
      const stable = options.stableClassNames || options.naming === 'source';
      const transformed = await transformCssxModule(code, isMdx ? `${fileName}.tsx` : fileName, {
        ...transformOptions,
        classNameAllocator: allocator,
        stableClassNames: stable,
        ...(stable ? { stableClassNameFileName: relative(root, fileName).replaceAll(sep, '/') } : {}),
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
  };
  if (options.coordination === 'manifest') {
    return withClassNameManifest(options.manifestPath!, effectiveClassNameOptions(options), collect);
  }
  return collect(options.classNameAllocator ?? createClassNameAllocator(effectiveClassNameOptions(options)));
}
