import type { NodePath } from '@babel/core';
import * as babelTypes from '@babel/types';

import { memberPropertyName } from './ast-helpers';
import { markAllCandidates } from './mark-all-candidates';
import { markAllFallbackClasses } from './mark-all-fallback-classes';
import { markAllStyleClasses } from './mark-all-style-classes';
import { markFallbackClasses } from './mark-fallback-classes';
import { markStyleClass } from './mark-style-class';
import { markStyleKeyCandidates } from './mark-style-key-candidates';
import type { FileState } from './plugin-types';

/**
 * Marks candidates reachable from references to locally compiled `create()` style maps.
 *
 * Static dot access keeps one key. Dynamic access and non-member references keep every key.
 *
 * @param program Program whose style bindings are inspected.
 * @param types Babel node helpers.
 * @param state Per-file compiler state.
 * @returns Nothing after updating reachability metadata.
 */
export function markReferencedStyleCandidates(
  program: NodePath<babelTypes.Program>,
  types: typeof babelTypes,
  state: FileState,
): void {
  for (const [styleName, candidatesByKey] of state.styleCandidates) {
    const binding = program.scope.getBinding(styleName);
    for (const reference of binding!.referencePaths) {
      const parent = reference.parentPath;
      if (!parent?.isMemberExpression() || parent.node.object !== reference.node) {
        markAllCandidates(state, candidatesByKey);
        markAllStyleClasses(state, styleName);
        markAllFallbackClasses(state, styleName);
        continue;
      }
      const key = memberPropertyName(parent.node, types);
      if (key === null) {
        markAllCandidates(state, candidatesByKey);
        markAllStyleClasses(state, styleName);
        markAllFallbackClasses(state, styleName);
      } else {
        markStyleKeyCandidates(state, candidatesByKey, key);
        markStyleClass(state, styleName, key);
        markFallbackClasses(state, styleName, key);
      }
    }
  }
}
