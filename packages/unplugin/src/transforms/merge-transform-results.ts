import type { TransformResult } from './transform-cssx-module';

/**
 * Combines metadata from independent source-block transforms into one module result.
 *
 * Later results take precedence for duplicate candidate, composite, or origin keys;
 * atomic class order follows the supplied result order while removing duplicates.
 *
 * @param code Final transformed source module.
 * @param results Results produced for each source block or embedded expression.
 * @returns A single transform result with merged metadata and stylesheet rules.
 */
export function mergeTransformResults(code: string, results: readonly TransformResult[]): TransformResult {
  return {
    code,
    rules: results.flatMap((result) => result.rules),
    candidates: Object.assign({}, ...results.map((result) => result.candidates)),
    composites: Object.assign({}, ...results.map((result) => result.composites)),
    atomicClasses: [...new Set(results.flatMap((result) => result.atomicClasses))],
    origins: Object.assign({}, ...results.map((result) => result.origins)),
    cssOnlySignature: code,
  };
}
