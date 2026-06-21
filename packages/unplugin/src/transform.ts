import { transformAsync } from '@babel/core';
import cssxBabelPlugin from '@cssxio/babel-plugin';
import { compileUtilities, createSelectorAliases } from '@cssxio/compiler';
import type { ClassNameAllocator, CssxRule } from '@cssxio/compiler';
import { assertPluginOptions, loadTheme, stableId, type CssxPluginOptions } from './options';
import type { CssxCandidateOrigin } from './stylesheet';

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

/** A source map accepted from a build tool. */
export interface IncomingSourceMap {
  /** Source map format version. CSSX accepts version 3. */
  readonly version: number;
  /** Source file names referenced by the map. */
  readonly sources: string[];
  /** Original identifier names referenced by the map. */
  readonly names: string[];
  /** Optional prefix for source file names. */
  readonly sourceRoot?: string;
  /** Optional source file contents. */
  readonly sourcesContent?: string[];
  /** Encoded source map segments. */
  readonly mappings: string;
  /** Name of the generated file. */
  readonly file: string;
}

/** Matches JavaScript and TypeScript module IDs, with an optional query. */
const SCRIPT_ID = /\.[cm]?[jt]sx?(?:\?.*)?$/;

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
  } = {},
  inputSourceMap?: IncomingSourceMap,
): Promise<TransformResult | null> {
  assertPluginOptions(options);
  const importSource = options.importSource ?? '@cssxio/cssx';
  if (!SCRIPT_ID.test(id) || !code.includes(importSource)) {
    return null;
  }
  const theme = await loadTheme(options);
  const result = await transformAsync(code, {
    babelrc: false,
    configFile: false,
    filename: id.split('?', 1)[0],
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
        },
      ],
    ],
    sourceMaps: true,
    ...(inputSourceMap ? { inputSourceMap } : {}),
  });
  if (!result?.code) {
    return null;
  }
  const metadata = result.metadata as unknown as {
    readonly cssx?: CssxMetadata & { readonly cssOnlySignature?: string };
  };
  const candidates = metadata.cssx?.candidates ?? {};
  const origins = metadata.cssx?.origins ?? {};
  const composites = metadata.cssx?.composites ?? {};
  const atomicClasses = metadata.cssx?.atomicClasses ?? [];
  const candidateNames = Object.keys(candidates);
  const utilityCss =
    candidateNames.length === 0
      ? ''
      : (
          await compileUtilities(
            candidateNames,
            (candidate) => candidates[candidate] ?? candidate,
            theme,
            createSelectorAliases(composites),
            new Set(atomicClasses),
          )
        ).css;
