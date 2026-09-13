import type { NodePath } from '@babel/core';
import type * as babelTypes from '@babel/types';

import { isCssxImport } from './is-cssx-import';

/**
 * Checks whether a call's local identifier is a named CSSX import.
 *
 * @param path Call expression whose scope is checked.
 * @param localName Local identifier used as the callee.
 * @param importedName CSSX export the binding must name.
 * @param t Babel node helpers.
 * @param importSource Module specifier that exports CSSX.
 * @returns True when the identifier is the requested named import from the configured source.
 */
export function importedFunctionBinding(
  path: NodePath<import('@babel/types').CallExpression>,
  localName: string,
  importedName: 'create' | 'props' | 'sx',
  t: typeof babelTypes,
  importSource: string,
): boolean {
  const binding = path.scope.getBinding(localName);
  const bindingPath = binding?.path;
  if (!bindingPath?.isImportSpecifier()) {
    return false;
  }
  const imported = bindingPath.node.imported;
  const actualName = t.isIdentifier(imported) ? imported.name : imported.value;
  return actualName === importedName && isCssxImport(bindingPath, importSource);
}
