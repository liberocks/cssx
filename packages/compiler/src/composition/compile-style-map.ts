import { createSelectorAliases } from '../atoms/create-selector-aliases';
import type { CompileResult } from '../compiler/compile-result';
import type { CompilerOptions } from '../compiler/compiler-options';
import { compileUtilities } from '../compiler/utilities';
import { cssId } from '../css/css-id';
import { compileStyleRecords } from './compile-style-records';

/**
 * Compiles one map of static utility strings.
 *
 * @param input Style names and their utility strings.
 * @param options Compiler options.
 * @returns The compiled styles, class names, candidates, and CSS rules.
 *
 * The function rejects invalid utilities and invalid theme input.
 */
export async function compileStyleMap(
  input: Readonly<Record<string, string>>,
  options: CompilerOptions = {},
): Promise<CompileResult> {
  const records = compileStyleRecords(input, options);
  const candidates = Object.keys(records.classes);
  if (candidates.length === 0) {
    return {
      styles: records.styles,
      classes: records.classes,
      candidates: records.candidates,
      classNames: records.classNames,
      composites: records.composites,
      rules: [],
    };
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
    styles: records.styles,
    classes: records.classes,
    candidates: records.candidates,
    classNames: records.classNames,
    composites: records.composites,
    rules: [{ className: cssId(compiled.css), css: compiled.css }],
  };
}
