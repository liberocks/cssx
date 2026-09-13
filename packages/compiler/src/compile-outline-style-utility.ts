import type { UtilityDeclaration } from './utility-types';
import { cloneDeclarations } from './utility-values';

/** Fixed outline styles resolved without theme values. */
const EXACT_OUTLINE_STYLES: Readonly<Record<string, readonly UtilityDeclaration[]>> = {
  outline: [
    { property: 'outline-style', value: 'solid' },
    { property: 'outline-width', value: '1px' },
  ],
  'outline-none': [{ property: 'outline-style', value: 'none' }],
  'outline-hidden': [
    { property: 'outline', value: '2px solid transparent' },
    { property: 'outline-offset', value: '2px' },
  ],
  'outline-solid': [{ property: 'outline-style', value: 'solid' }],
  'outline-dashed': [{ property: 'outline-style', value: 'dashed' }],
  'outline-dotted': [{ property: 'outline-style', value: 'dotted' }],
  'outline-double': [{ property: 'outline-style', value: 'double' }],
};

/**
 * Resolves outline style and width utilities.
 *
 * @param utility Utility name without variants.
 * @returns Its declarations, or null when another outline recipe applies.
 */
export function compileOutlineStyleUtility(utility: string): UtilityDeclaration[] | null {
  const exact = EXACT_OUTLINE_STYLES[utility];
  if (exact) {
    return cloneDeclarations(exact);
  }
  const width = /^outline-(0|1|2|4|8|\[[^\]]+\])$/.exec(utility);
  if (!width) {
    return null;
  }
  const raw = width[1]!;
  return [
    { property: 'outline-width', value: raw.startsWith('[') ? raw.slice(1, -1) : `${raw}px`.replace('0px', '0') },
  ];
}
