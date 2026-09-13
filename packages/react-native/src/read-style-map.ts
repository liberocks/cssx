import type { NodePath } from '@babel/core';
import type * as BabelTypes from '@babel/types';
import type { CallExpression, ObjectExpression } from '@babel/types';

/**
 * Reads a static Babel object expression into a CSSX style map.
 *
 * @param object Object literal passed to `create`.
 * @param types Babel type predicates.
 * @param path Babel path used for code-frame diagnostics.
 * @returns The static utility string map.
 */
export function readStyleMap(
  object: ObjectExpression,
  types: typeof BabelTypes,
  path: NodePath<CallExpression>,
): Readonly<Record<string, string>> {
  const input: Record<string, string> = {};
  for (const property of object.properties) {
    if (!types.isObjectProperty(property) || !types.isStringLiteral(property.value)) {
      throw path.buildCodeFrameError('CSSX React Native style values must be static string literals.');
    }
    if (property.computed) {
      throw path.buildCodeFrameError('CSSX React Native style keys must be static.');
    }
    const key = types.isIdentifier(property.key)
      ? property.key.name
      : types.isStringLiteral(property.key) || types.isNumericLiteral(property.key)
        ? String(property.key.value)
        : null;
    if (key === null) {
      throw path.buildCodeFrameError('CSSX React Native style keys must be static.');
    }
    input[key] = property.value.value;
  }
  return input;
}
