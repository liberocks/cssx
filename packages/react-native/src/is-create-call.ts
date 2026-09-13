import type { NodePath } from '@babel/core';
import type * as BabelTypes from '@babel/types';
import type { CallExpression } from '@babel/types';

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
