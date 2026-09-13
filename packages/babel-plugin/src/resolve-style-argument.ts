import type * as babelTypes from '@babel/types';
import type { CompiledStyle } from '@cssxio/compiler';

import { markStyleKeyCandidates } from './mark-style-key-candidates';
import type { FileState } from './plugin-types';

/**
 * Resolves one `props()` argument to compiled styles that can be folded.
 *
 * It accepts null, false, nested arrays without holes or spreads, and non-computed dot access
 * to a style created in this module. Unsupported forms return undefined to retain the runtime call.
 *
 * @param node Props argument or nested array element to resolve.
 * @param types Babel node helpers.
 * @param state Per-file compiler state.
 * @returns Compiled styles, null for ignored values, or undefined when folding must stop.
 */
export function resolveStyleArgument(
  node:
    babelTypes.Expression | babelTypes.JSXNamespacedName | babelTypes.SpreadElement | babelTypes.ArgumentPlaceholder,
  types: typeof babelTypes,
  state: FileState,
): readonly CompiledStyle[] | null | undefined {
  if (types.isNullLiteral(node) || types.isBooleanLiteral(node, { value: false })) {
    return null;
  }
  if (types.isArrayExpression(node)) {
    const styles: CompiledStyle[] = [];
    for (const element of node.elements) {
      if (!element || types.isSpreadElement(element)) {
        return undefined;
      }
      const resolved = resolveStyleArgument(element, types, state);
      if (resolved === undefined) {
        return undefined;
      }
      if (resolved) {
        styles.push(...resolved);
      }
    }
    return styles;
  }
  if (
    !types.isMemberExpression(node) ||
    node.computed ||
    !types.isIdentifier(node.object) ||
    !types.isIdentifier(node.property)
  ) {
    return undefined;
  }
  const map = state.styles.get(node.object.name);
  const style = map?.[node.property.name];
  const candidates = state.styleCandidates.get(node.object.name);
  if (style && candidates) {
    markStyleKeyCandidates(state, candidates, node.property.name);
  }
  return style ? [style] : undefined;
}
