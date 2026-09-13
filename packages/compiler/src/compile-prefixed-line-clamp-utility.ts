import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles the multi-property `line-clamp-*` utility family.
 *
 * @param utility Utility candidate without variants.
 * @returns Line-clamp declarations, or null when the candidate is outside this family.
 */
export function compilePrefixedLineClampUtility(utility: string): UtilityDeclaration[] | null {
  const clamp = /^line-clamp-(none|\d+)$/.exec(utility);
  if (!clamp) {
    return null;
  }
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
