import { isCompiledStyle } from './is-compiled-style';
import { isStyleArray } from './is-style-array';
import type { CompiledStyle, CompiledUtility, StyleInput } from './types';

/**
 * Collects nested style inputs for later conflict resolution.
 *
 * @param inputs Style inputs to collect.
 * @param parts Ordered raw classes and compiled styles.
 * @param records Compiled utility records.
 * @returns The number of compiled style objects encountered.
 */
export function collectStyleInputs(
  inputs: readonly StyleInput[],
  parts: Array<string | CompiledStyle>,
  records: CompiledUtility[],
): number {
  let styleCount = 0;
  for (const input of inputs) {
    if (!input) {
      continue;
    }
    if (isStyleArray(input)) {
      styleCount += collectStyleInputs(input, parts, records);
    } else if (typeof input === 'string') {
      parts.push(input);
    } else if (isCompiledStyle(input)) {
      records.push(...input._);
      parts.push(input);
      styleCount++;
    } else {
      throw new Error('cssx.props() received an object that was not compiled by CSSX.');
    }
  }
  return styleCount;
}
