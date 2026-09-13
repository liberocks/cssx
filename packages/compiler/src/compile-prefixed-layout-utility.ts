import { resolveArbitraryCssValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles layout support utilities for columns, content, breaks, object position, tabs, and clamping.
 *
 * @param utility Utility name without variants.
 * @returns Layout declaration(s), or null when unsupported.
 */
export function compilePrefixedLayoutUtility(utility: string): UtilityDeclaration | UtilityDeclaration[] | null {
  const columns = /^columns-(auto|\d+|\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (columns) {
    const value = columns[1]!;
    return {
      property: 'columns',
      value: value.startsWith('[') || value.startsWith('(') ? resolveArbitraryCssValue(value) : value,
    };
  }
  if (utility === 'content-none') {
    return { property: 'content', value: 'none' };
  }
  const content = /^content-(\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (content) {
    return { property: 'content', value: resolveArbitraryCssValue(content[1]!) };
  }
  const breakUtility =
    /^(?:break-(before|after)-(auto|avoid|all|avoid-page|page|left|right|column)|break-(inside)-(auto|avoid|avoid-page|avoid-column))$/.exec(
      utility,
    );
  if (breakUtility) {
    const family = breakUtility[1] ?? breakUtility[3]!;
    const value = breakUtility[2] ?? breakUtility[4]!;
    return { property: `break-${family}`, value };
  }
  const object = /^object-(\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (object) {
    return { property: 'object-position', value: resolveArbitraryCssValue(object[1]!) };
  }
  const tabSize = /^tab-(\d+|\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (tabSize) {
    const value = tabSize[1]!;
    return {
      property: 'tab-size',
      value: value.startsWith('[') || value.startsWith('(') ? resolveArbitraryCssValue(value) : value,
    };
  }
  const listImage = /^list-image-(\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (listImage) {
    return { property: 'list-style-image', value: resolveArbitraryCssValue(listImage[1]!) };
  }
  const clamp = /^line-clamp-(none|\d+)$/.exec(utility);
  if (clamp) {
    return clamp[1] === 'none'
      ? [
          { property: 'overflow', value: 'visible', semanticGroup: 'line-clamp' },
          { property: 'display', value: 'block', semanticGroup: 'line-clamp' },
          { property: '-webkit-box-orient', value: 'horizontal', semanticGroup: 'line-clamp' },
          { property: '-webkit-line-clamp', value: 'unset', semanticGroup: 'line-clamp' },
        ]
      : [
          { property: 'overflow', value: 'hidden', semanticGroup: 'line-clamp' },
          { property: 'display', value: '-webkit-box', semanticGroup: 'line-clamp' },
          { property: '-webkit-box-orient', value: 'vertical', semanticGroup: 'line-clamp' },
          { property: '-webkit-line-clamp', value: clamp[1]!, semanticGroup: 'line-clamp' },
        ];
  }
  return null;
}
