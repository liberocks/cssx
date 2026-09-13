import { type CompiledStyleRecordMap, compileStyleRecordMaps } from './compiled-style-record-maps';
import type { StyleCompilerOptions } from './style-compiler';

/**
 * Compiles one static style map to records for the runtime.
 *
 * @param input Style names and their utility strings.
 * @param options Compiler options.
 * @returns The compiled styles, class names, and source candidates.
 */
export function compileStyleRecords(
  input: Readonly<Record<string, string>>,
  options: StyleCompilerOptions = {},
): CompiledStyleRecordMap {
  return compileStyleRecordMaps({ $: input }, options).styleMaps.$!;
}
