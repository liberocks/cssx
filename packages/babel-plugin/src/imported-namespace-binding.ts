import type { NodePath } from '@babel/core';

import { isCssxImport } from './is-cssx-import';

/**
 * Checks whether a call's local identifier is a CSSX namespace or default import.
 *
 * @param path Call expression whose scope is checked.
 * @param localName Local namespace or default import identifier.
 * @param importSource Module specifier that exports CSSX.
 * @returns True when the identifier is a namespace or default import from the configured source.
 */
export function importedNamespaceBinding(
  path: NodePath<import('@babel/types').CallExpression>,
  localName: string,
  importSource: string,
): boolean {
  const binding = path.scope.getBinding(localName);
  const bindingPath = binding?.path;
  if (!bindingPath || (!bindingPath.isImportNamespaceSpecifier() && !bindingPath.isImportDefaultSpecifier())) {
    return false;
  }
  return isCssxImport(bindingPath, importSource);
}
