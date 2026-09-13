import type { NodePath } from '@babel/core';
import type * as babelTypes from '@babel/types';
import type { ObjectExpression } from '@babel/types';

import { diagnosticError, objectPropertyName, readStaticString } from './ast-helpers';
import type { FileState } from './plugin-types';

/**
 * Reads the static utility map accepted by a `create()` call.
 *
 * It accepts plain non-computed properties with static string values. Unsupported properties cause
 * a source diagnostic, and accepted value ranges are recorded for CSS-only edit detection.
 *
 * @param path Object argument from a create call.
 * @param types Babel node helpers.
 * @param state Per-file compiler state.
 * @returns The style names and their static utility strings.
 */
export function readStyleMap(
  path: NodePath<ObjectExpression>,
  types: typeof babelTypes,
  state: FileState,
): Record<string, string> {
  const result: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const property of path.get('properties')) {
    if (!property.isObjectProperty() || property.node.computed) {
      throw diagnosticError(property, 'cssx.create() only supports plain object properties.');
    }
    const key = objectPropertyName(property.node, types);
    const value = property.get('value');
    const utilityString = readStaticString(value);
    if (!key || utilityString === null) {
      throw diagnosticError(property, 'Each cssx.create() value must be a static utility string.');
    }
    state.cssRanges.push({ start: value.node.start!, end: value.node.end! });
    result[key] = utilityString;
  }
  return result;
}
