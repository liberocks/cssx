import type { NodePath } from '@babel/core';
import type * as babelTypes from '@babel/types';

import { importedFunctionBinding } from './imported-function-binding';
import { importedNamespaceBinding } from './imported-namespace-binding';

/**
 * Checks whether a call invokes one supported CSSX API form.
 *
 * Named imports are called directly. Namespace and default imports must use dot notation.
 *
 * @param path Call expression to inspect.
 * @param t Babel node helpers.
 * @param importSource Module specifier that exports CSSX.
 * @param api CSSX API name to match.
 * @returns True when the call is bound to the requested CSSX API.
 */
export function isCssxApiCall(
  path: NodePath<import('@babel/types').CallExpression>,
  t: typeof babelTypes,
  importSource: string,
  api: 'create' | 'props' | 'sx',
): boolean {
  const callee = path.node.callee;
  if (t.isIdentifier(callee)) {
    return importedFunctionBinding(path, callee.name, api, t, importSource);
  }
  return (
    t.isMemberExpression(callee) &&
    !callee.computed &&
    t.isIdentifier(callee.object) &&
    t.isIdentifier(callee.property, { name: api }) &&
    importedNamespaceBinding(path, callee.object.name, importSource)
  );
}
