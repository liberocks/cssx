import type { transformAsync } from '@babel/core';
import type { ClassNameAllocator, CssxRule } from '@cssxio/compiler';

import { assertPluginOptions, type CssxPluginOptions } from './options';
import type { IncomingSourceMap } from './source-map-from-context';
import type { CssxCandidateOrigin } from './stylesheet';
import { transformAstroSxModule } from './transform-astro-sx';
import { transformBabelCssxModule } from './transform-babel-cssx-module';
import { transformVueSfcModule } from './transform-vue-sfc';

/** The result of transforming one source module. */
export interface TransformResult {
  /** JavaScript source after the CSSX transform. */
  readonly code: string;
  /** Compiled utility rules collected from this module. */
  readonly rules: readonly CssxRule[];
  /** Maps utility strings to generated class names. */
  readonly candidates: Readonly<Record<string, string>>;
  /** Maps composite classes to their winning atomic classes. */
  readonly composites: Readonly<Record<string, readonly string[]>>;
  /** Atomic classes required by compiled styles that survive to runtime. */
  readonly atomicClasses: readonly string[];
  /** Maps utility strings to their locations in the source module. */
  readonly origins: Readonly<Record<string, CssxCandidateOrigin>>;
  /** Source with CSSX utility literals removed, used to identify CSS-only edits. */
  readonly cssOnlySignature: string;
  /** Source map that continues a map supplied by an earlier transform. */
  readonly map?: NonNullable<Awaited<ReturnType<typeof transformAsync>>>['map'];
}

/** Extensions of JavaScript, TypeScript, Astro, and Vue modules handled by this transform. */
const SCRIPT_EXTENSIONS = new Set([
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
  '.vue',
]);

/**
 * Transforms one source module that imports CSSX.
 *
 * @param code Source code to transform.
 * @param id The source module ID.
 * @param options Adapter options.
 * @param inputSourceMap An optional source map from an earlier transform.
 * @returns The transformed module, or null when the module does not use CSSX.
 */
export async function transformCssxModule(
  code: string,
  id: string,
  options: CssxPluginOptions & {
    readonly classNameAllocator?: ClassNameAllocator;
    readonly stableClassNames?: boolean;
    readonly stableClassNameFileName?: string;
  } = {},
  inputSourceMap?: IncomingSourceMap,
): Promise<TransformResult | null> {
  assertPluginOptions(options);
  const importSource = options.importSource ?? '@cssxio/cssx';
  const sourceId = id.split('?', 1).join('');
  if (!SCRIPT_EXTENSIONS.has(sourceId.slice(sourceId.lastIndexOf('.'))) || !code.includes(importSource)) {
    return null;
  }
  if (sourceId.endsWith('.astro')) {
    return transformAstroSxModule(code, id, options, transformCssxModule);
  }
  if (sourceId.endsWith('.vue')) {
    return transformVueSfcModule(code, id, options, transformCssxModule);
  }
  return transformBabelCssxModule(code, sourceId, options, inputSourceMap);
}
