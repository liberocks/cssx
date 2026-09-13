import { transformAsync } from '@babel/core';
import cssxBabelPlugin from '@cssxio/babel-plugin';
import { compileUtilities, createSelectorAliases } from '@cssxio/compiler';
import type { ClassNameAllocator } from '@cssxio/compiler';

import { compiledCssRule } from './compiled-css-rule';
import { loadTheme, type CssxPluginOptions } from './options';
import type { IncomingSourceMap } from './source-map-from-context';
import type { CssxCandidateOrigin } from './stylesheet';
import type { TransformResult } from './transform-cssx-module';
import { wrapCssLayer } from './wrap-css-layer';

/** CSSX metadata written by the Babel transform. */
interface CssxMetadata {
  /** Maps utility strings to generated class names. */
  readonly candidates: Readonly<Record<string, string>>;
  /** Maps utility strings to their locations in the source module. */
  readonly origins: Readonly<Record<string, CssxCandidateOrigin>>;
  /** Maps composite classes to their winning atomic classes. */
  readonly composites: Readonly<Record<string, readonly string[]>>;
  /** Atomic classes required by compiled styles that survive to runtime. */
  readonly atomicClasses: readonly string[];
  /** Source with CSSX utility literals removed. */
  readonly cssOnlySignature: string;
}

/**
 * Transforms a JavaScript-like source module through Babel and compiles its CSSX rules.
 *
 * @param code Source text that imports CSSX.
 * @param sourceId Filename passed to Babel for parsing and source-map generation.
 * @param options Validated CSSX adapter options.
 * @param inputSourceMap Optional map from the preceding transform.
 * @returns Transformed code, utility rules, candidate metadata, and a composed source map.
 */
export async function transformBabelCssxModule(
  code: string,
  sourceId: string,
  options: CssxPluginOptions & {
    readonly classNameAllocator?: ClassNameAllocator;
    readonly stableClassNames?: boolean;
    readonly stableClassNameFileName?: string;
  },
  inputSourceMap?: IncomingSourceMap,
): Promise<TransformResult> {
  const importSource = options.importSource ?? '@cssxio/cssx';
  const theme = await loadTheme(options);
  const transformed = (await transformAsync(code, {
    babelrc: false,
    configFile: false,
    filename: sourceId,
    parserOpts: { plugins: ['jsx', 'typescript'] },
    plugins: [
      [
        cssxBabelPlugin,
        {
          importSource,
          classNameAllocator: options.classNameAllocator,
          theme,
          reusabilityBudget: options.reusabilityBudget,
          stableClassNames: options.stableClassNames,
          stableClassNameFileName: options.stableClassNameFileName,
          darkMode: options.darkMode,
        },
      ],
    ],
    sourceMaps: true,
    ...(inputSourceMap ? { inputSourceMap } : {}),
  }))!;
  const metadata = transformed.metadata as unknown as { readonly cssx: CssxMetadata };
  const { candidates, origins, composites, atomicClasses, cssOnlySignature } = metadata.cssx;
  const candidateNames = Object.keys(candidates);
  const utilityCss =
    candidateNames.length === 0
      ? ''
      : (
          await compileUtilities(
            candidateNames,
            (candidate) => candidates[candidate]!,
            theme,
            createSelectorAliases(composites),
            new Set(atomicClasses),
            { darkMode: options.darkMode },
          )
        ).css;

  return {
    code: transformed.code!,
    rules: utilityCss ? [compiledCssRule(wrapCssLayer(utilityCss, options.layer))] : [],
    candidates,
    composites,
    atomicClasses,
    origins,
    cssOnlySignature,
    map: transformed.map!,
  };
}
