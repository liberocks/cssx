import type { NodePath } from '@babel/core';
import type * as babelTypes from '@babel/types';

import type { FileState } from './plugin-types';
import { styleMapExpression } from './style-map-expression';

/**
 * Materializes style maps that still have runtime references after folding.
 *
 * @param program Program whose lexical bindings are inspected.
 * @param types Babel node helpers.
 * @param state Per-file compiler state containing generated style maps.
 * @returns Nothing after replacing live map initializers.
 */
export function materializeLiveStyleMaps(
  program: NodePath<babelTypes.Program>,
  types: typeof babelTypes,
  state: FileState,
): void {
  for (const [styleName, styles] of state.styles) {
    const binding = program.scope.getBinding(styleName);
    if (!binding?.path.isVariableDeclarator() || binding.referencePaths.length === 0) {
      continue;
    }
    binding.path.node.init = styleMapExpression(styles, types);
  }
}
