import { createSelectorAliases } from '../atoms/create-selector-aliases';
import type { CompilerOptions } from '../compiler/compiler-options';
import { compileUtilities } from '../compiler/utilities';
import { cssId } from '../css/css-id';
import type { CompileMapsResult } from './compile-maps-result';
import { compileStyleRecordMaps } from './compiled-style-record-maps';

/**
 * Compiles several style maps as one set of CSS.
 *
 * @param inputs Map names and their static utility maps.
 * @param options Compiler options.
 * @returns A compiled map for each input and the shared CSS rules.
 *
 * Shared resources, such as keyframes, are added once. The function rejects
 * invalid utilities and invalid theme input.
 */
export async function compileStyleMaps(
  inputs: Readonly<Record<string, Readonly<Record<string, string>>>>,
  options: CompilerOptions = {},
): Promise<CompileMapsResult> {
  const records = compileStyleRecordMaps(inputs, options);
  const candidates = Object.keys(records.classes);
  if (candidates.length === 0) {
    return { styleMaps: records.styleMaps, rules: [] };
  }
  const compiled = await compileUtilities(
    candidates,
    (candidate) => records.classes[candidate]!,
    options.theme,
    createSelectorAliases(records.composites),
    undefined,
    { darkMode: options.darkMode },
  );
  return {
    styleMaps: records.styleMaps,
    rules: [{ className: cssId(compiled.css), css: compiled.css }],
  };
}
