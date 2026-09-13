import type { NodePath } from '@babel/core';
import type * as babelTypes from '@babel/types';

import type { FileState } from './plugin-types';

/**
 * Removes generated style-map declarations after all references have been folded away.
 *
 * @param program Program whose lexical bindings are inspected.
 * @param state Per-file compiler state containing generated style maps.
 * @returns Nothing after removing dead declarations.
 */
export function removeDeadStyleMaps(program: NodePath<babelTypes.Program>, state: FileState): void {
  for (const styleName of state.styles.keys()) {
    const binding = program.scope.getBinding(styleName);
    if (binding && binding.referencePaths.length === 0 && binding.path.isVariableDeclarator()) {
      binding.path.remove();
    }
  }
}
