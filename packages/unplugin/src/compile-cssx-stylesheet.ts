import { compileUtilities, createSelectorAliases } from '@cssxio/compiler';
import type { DarkMode } from '@cssxio/compiler';

import { createCssSourceMap } from './create-css-source-map';
import { CSSX_PREFLIGHT } from './preflight';
import type { CssxSourceModule, CssxSourceOrigin, CssxStylesheet } from './stylesheet-types';

/**
 * Builds one stylesheet from source module data.
 *
 * @param data CSSX data from source modules.
 * @param theme Optional CSS theme input.
 * @param layer Optional CSS layer for the output.
 * @param sourceMap Whether to generate a CSS source map.
 * @param darkMode Controls how the `dark` variant is activated.
 * @param preflight Whether to add the browser baseline before utility rules.
 * @returns The generated CSS and its source map when source locations exist.
 */
export async function compileCssxStylesheet(
  data: readonly CssxSourceModule[],
  theme?: string,
  layer?: string,
  sourceMap = true,
  darkMode?: DarkMode,
  preflight = true,
): Promise<CssxStylesheet> {
  const candidates: Record<string, string> = Object.create(null) as Record<string, string>;
  const composites: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;
  const atomicClasses = new Set<string>();
  let hasAtomicClassMetadata = true;
  const origins = new Map<string, CssxSourceOrigin>();
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
  const preflightCss = preflight ? CSSX_PREFLIGHT : '';
  if (names.length === 0) {
    const css = preflightCss && layer ? `@layer ${layer}{${preflightCss}}` : preflightCss;
    return { css };
  }
  const compiled = await compileUtilities(
    names,
    (candidate) => candidates[candidate]!,
    theme,
    createSelectorAliases(composites),
    hasAtomicClassMetadata ? atomicClasses : undefined,
    { darkMode },
  );
  const layerPrefix = layer ? `@layer ${layer}{` : '';
  const css = `${layerPrefix}${preflightCss}${compiled.css}${layerPrefix ? '}' : ''}`;
  const map = sourceMap
    ? createCssSourceMap(`${layerPrefix}${preflightCss}${compiled.prefixCss}`, compiled.entries, origins)
    : undefined;
  return { css, ...(map ? { map } : {}) };
}
