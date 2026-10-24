import type { NodePath } from '@babel/core';

/**
 * Reads a static string literal or an unchanged local constant initialized with one.
 *
 * @param path Expression to read.
 * @returns The static string, or null when the expression is not a supported static form.
 */
export function readStaticString(path: NodePath): string | null {
  if (path.isStringLiteral()) {
    return path.node.value;
  }
  if (!path.isIdentifier()) {
    return null;
  }
  const binding = path.scope.getBinding(path.node.name);
  if (!binding?.constant || binding.constantViolations.length !== 0 || !binding.path.isVariableDeclarator()) {
    return null;
  }
  const initializer = binding.path.get('init');
  return initializer.isStringLiteral() ? initializer.node.value : null;
}
