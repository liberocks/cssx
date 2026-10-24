import type { NodePath } from '@babel/core';
import type * as babelTypes from '@babel/types';

import { isCssxApiCall } from './is-cssx-api-call';

/**
 * Checks whether a call invokes the CSSX sx API.
 *
 * @param path Call expression to inspect.
 * @param t Babel node helpers.
 * @param importSource Module specifier that exports CSSX.
 * @returns True when the call uses a supported sx import form.
 */
export function isSxCall(
  path: NodePath<import('@babel/types').CallExpression>,
  t: typeof babelTypes,
  importSource: string,
): boolean {
  return isCssxApiCall(path, t, importSource, 'sx');
}
