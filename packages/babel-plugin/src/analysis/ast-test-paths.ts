import { transformSync, type NodePath } from '@babel/core';
import type * as babelTypes from '@babel/types';

/**
 * Runs a visitor over source calls and returns the values produced for each call path.
 *
 * @param source JavaScript module to parse.
 * @param inspect Callback that inspects one call path.
 * @returns Results in Babel visitor order.
 */
export function inspectCalls<T>(source: string, inspect: (path: NodePath<babelTypes.CallExpression>) => T): T[] {
  const results: T[] = [];
  transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: [
      () => ({
        visitor: {
          CallExpression(path: NodePath<babelTypes.CallExpression>) {
            results.push(inspect(path));
          },
        },
      }),
    ],
  });
  return results;
}
