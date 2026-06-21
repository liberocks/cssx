import { compileUtilities, createSelectorAliases } from '@cssxio/compiler';
import { basename } from 'node:path';

/** The source location of one utility string. */
export interface CssxCandidateOrigin {
  /** Zero-based line number in the source module. */
  readonly line: number;
  /** Zero-based column number in the source module. */
  readonly column: number;
}

/** CSSX data collected from one source module. */
export interface CssxSourceModule {
  /** Stable source module ID. */
  readonly id: string;
  /** Maps utility strings to generated class names. */
  readonly candidates: Readonly<Record<string, string>>;
  /** Maps composite classes to their winning atomic classes. */
  readonly composites?: Readonly<Record<string, readonly string[]>>;
  /** Atomic classes required by compiled styles that survive to runtime. */
  readonly atomicClasses?: readonly string[];
  /** Maps utility strings to source locations when they are available. */
  readonly origins?: Readonly<Record<string, CssxCandidateOrigin>>;
}

/** A source map for generated CSS. */
export interface CssxSourceMap {
  /** Source map format version. */
  readonly version: 3;
  /** Source module IDs referenced by the map. */
  readonly sources: readonly string[];
  /** CSSX does not emit named source map entries. */
  readonly names: readonly [];
  /** Encoded source map segments for generated rules. */
  readonly mappings: string;
}

/** A generated stylesheet and its optional source map. */
export interface CssxStylesheet {
  /** Generated, deduplicated CSS. */
  readonly css: string;
  /** Source map for generated CSS when source locations are available. */
  readonly map?: CssxSourceMap;
}

/**
 * Builds one stylesheet from source module data.
 *
 * @param data CSSX data from source modules.
 * @param theme Optional CSS theme input.
 * @param layer Optional CSS layer for the output.
 * @param sourceMap Whether to generate a CSS source map.
 * @returns The generated CSS and its source map when source locations exist.
 */
export async function compileCssxStylesheet(
  data: readonly CssxSourceModule[],
  theme?: string,
  layer?: string,
  sourceMap = true,
): Promise<CssxStylesheet> {
  const candidates: Record<string, string> = Object.create(null) as Record<string, string>;
  const composites: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;
  const atomicClasses = new Set<string>();
  let hasAtomicClassMetadata = true;
  const origins = new Map<string, { readonly id: string; readonly line: number; readonly column: number }>();
  for (const module of [...data].sort((left, right) => left.id.localeCompare(right.id))) {
    for (const [candidate, className] of Object.entries(module.candidates)) {
      if (!(candidate in candidates)) {
        candidates[candidate] = className;
      }
      if (module.id && !origins.has(candidate)) {
        const origin = module.origins?.[candidate];
        origins.set(candidate, { id: module.id, line: origin?.line ?? 0, column: origin?.column ?? 0 });
      }
    }
    for (const [className, atomicClasses] of Object.entries(module.composites ?? {})) {
      const existing = composites[className];
      if (existing && existing.join(' ') !== atomicClasses.join(' ')) {
        throw new Error(`CSSX composite class collision for "${className}".`);
      }
      composites[className] = atomicClasses;
    }
    if (module.atomicClasses === undefined) {
      hasAtomicClassMetadata = false;
    }
    for (const atomicClass of module.atomicClasses ?? []) {
      atomicClasses.add(atomicClass);
    }
  }
  const names = Object.keys(candidates).sort();
  if (names.length === 0) {
    return { css: '' };
  }
  const compiled = await compileUtilities(
    names,
    (candidate) => candidates[candidate] ?? candidate,
    theme,
    createSelectorAliases(composites),
    hasAtomicClassMetadata ? atomicClasses : undefined,
  );
  const layerPrefix = compiled.css && layer ? `@layer ${layer}{` : '';
  const css = `${layerPrefix}${compiled.css}${layerPrefix ? '}' : ''}`;
  const map = sourceMap
    ? createCssSourceMap(`${layerPrefix}${compiled.prefixCss}`, compiled.entries, origins)
    : undefined;
  return { css, ...(map ? { map } : {}) };
}

/**
 * Adds a source map comment to CSS when a map exists.
 *
 * @param compiled Generated stylesheet data.
 * @param fileName Name of the emitted CSS file.
 * @returns CSS with a relative source map comment, or unchanged CSS without a map.
 */
export function cssWithSourceMapComment(compiled: CssxStylesheet, fileName: string): string {
  return compiled.map ? `${compiled.css}\n/*# sourceMappingURL=${basename(fileName)}.map */` : compiled.css;
}

/**
 * Serializes a CSS source map for an emitted stylesheet.
 *
 * @param map Generated CSS source map.
 * @param fileName Name of the emitted CSS file.
 * @returns JSON source map content with its output file name.
 */
export function cssSourceMap(map: CssxSourceMap, fileName: string): string {
  return JSON.stringify({ ...map, file: fileName });
}

/**
 * Creates mappings from generated utility rules to their source locations.
 *
 * @param prefixCss CSS before individual utility rules.
 * @param entries Compiled utility rules in output order.
 * @param origins Source locations indexed by utility string.
 * @returns A CSS source map, or undefined when no source locations exist.
 */
function createCssSourceMap(
  prefixCss: string,
  entries: readonly { readonly candidate: string; readonly css: string }[],
  origins: ReadonlyMap<string, { readonly id: string; readonly line: number; readonly column: number }>,
): CssxSourceMap | undefined {
  const sources = [
    ...new Set(entries.map((entry) => origins.get(entry.candidate)?.id).filter((id): id is string => !!id)),
  ].sort();
  if (sources.length === 0) {
    return undefined;
  }
  const sourceIndexes = new Map(sources.map((source, index) => [source, index]));
  const points: Array<{
    readonly column: number;
