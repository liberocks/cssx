import * as babelTypes from '@babel/types';

/** Babel expression node forms accepted by the static `sx()` reader. */
type StaticSxNode =
  babelTypes.Expression | babelTypes.JSXNamespacedName | babelTypes.SpreadElement | babelTypes.ArgumentPlaceholder;

/**
 * Reads a fully static `sx()` input as one utility source.
 *
 * @param nodes `sx()` arguments or nested array elements.
 * @param types Babel node helpers.
 * @returns A space-separated utility string, or null if any node is dynamic.
 */
export function readStaticSxSource(nodes: readonly StaticSxNode[], types: typeof babelTypes): string | null {
  const values: string[] = [];
  for (const node of nodes) {
    if (types.isStringLiteral(node)) {
      values.push(node.value);
    } else if (types.isNullLiteral(node) || types.isBooleanLiteral(node, { value: false })) {
      continue;
    } else if (types.isArrayExpression(node) && node.elements.every((element) => element !== null)) {
      const nested = readStaticSxSource(
        node.elements.filter((element): element is Exclude<typeof element, null> => element !== null),
        types,
      );
      if (nested === null) {
        return null;
      }
      values.push(nested);
    } else {
      return null;
    }
  }
  return values.filter(Boolean).join(' ');
}
