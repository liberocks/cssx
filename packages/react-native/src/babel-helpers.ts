import type { NodePath } from '@babel/core';
import type * as BabelTypes from '@babel/types';
import type { CallExpression, ObjectExpression } from '@babel/types';

/**
 * Determines whether a call is the imported CSSX React Native `create` binding.
 *
 * @param path Babel path for the candidate call.
 * @param importSource Module specifier accepted as the CSSX runtime.
 * @param types Babel type predicates.
 * @returns Whether the call is a CSSX `create` invocation.
 */
export function isCreateCall(path: NodePath<CallExpression>, importSource: string, types: typeof BabelTypes): boolean {
  if (!types.isIdentifier(path.node.callee)) {
    return false;
  }
  const binding = path.scope.getBinding(path.node.callee.name);
  const declaration = binding?.path.parentPath?.node;
  return Boolean(
    binding?.path.isImportSpecifier() &&
    types.isIdentifier(binding.path.node.imported, { name: 'create' }) &&
    types.isImportDeclaration(declaration) &&
    declaration.source.value === importSource,
  );
}

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
