import type { NodePath } from '@babel/core';
import type * as babelTypes from '@babel/types';

import { diagnosticError } from './diagnostic-error';
import { importedNamespaceBinding } from './imported-namespace-binding';

/**
 * Rejects computed CSSX API access on namespace and default imports.
 *
 * @param path Call expression to validate.
 * @param t Babel node helpers.
 * @param importSource Module specifier that exports CSSX.
 * @returns Nothing when the call does not use a forbidden computed CSSX API property.
 */
export function assertNoComputedCssxApiCall(
  path: NodePath<import('@babel/types').CallExpression>,
  t: typeof babelTypes,
  importSource: string,
): void {
  const callee = path.node.callee;
  if (
    !t.isMemberExpression(callee) ||
    !callee.computed ||
    !t.isIdentifier(callee.object) ||
    !t.isStringLiteral(callee.property)
  ) {
    return;
  }
  if (
    (callee.property.value === 'create' || callee.property.value === 'props' || callee.property.value === 'sx') &&
    importedNamespaceBinding(path, callee.object.name, importSource)
  ) {
    throw diagnosticError(path, 'CSSX API calls must use dot notation, for example cssx.create(...).');
  }
}
