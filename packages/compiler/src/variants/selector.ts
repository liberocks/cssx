import { parseSelector } from './parse-selector';

/**
 * Replaces CSS nesting nodes without touching quoted or attribute content.
 *
 * @param selector Arbitrary selector source.
 * @param replacement Selector text that replaces nesting nodes.
 * @returns Rewritten selector, or null when no nesting node exists.
 */
export function replaceNestingSelectors(selector: string, replacement: string): string | null {
  const ast = parseSelector(selector);
  if (!ast.hasNesting) {
    return null;
  }
  return ast.nodes
    .map((node, index) => {
      if (node.type !== 'nesting') {
        return node.value;
      }
      const next = ast.nodes[index + 1];
      const descendantType = next?.type === 'text' && /^[a-z]/i.test(next.value);
      return descendantType ? `${replacement} ` : replacement;
    })
    .join('');
}
