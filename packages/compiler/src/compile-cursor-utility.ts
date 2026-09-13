import type { UtilityDeclaration } from './utility-types';

/** Cursor keywords accepted by the built-in utility grammar. */
const CURSOR_VALUES =
  'auto|default|pointer|wait|text|move|help|not-allowed|none|context-menu|progress|cell|crosshair|vertical-text|alias|copy|no-drop|grab|grabbing|all-scroll|col-resize|row-resize|n-resize|e-resize|s-resize|w-resize|ne-resize|nw-resize|se-resize|sw-resize|ew-resize|ns-resize|nesw-resize|nwse-resize|zoom-in|zoom-out';

/**
 * Resolves cursor and will-change utilities.
 *
 * @param utility Utility name without variants.
 * @returns The declaration, or null when unsupported.
 */
export function compileCursorUtility(utility: string): UtilityDeclaration | null {
  const cursor = new RegExp(`^cursor-(${CURSOR_VALUES})$`).exec(utility);
  if (cursor) {
    return { property: 'cursor', value: cursor[1]! };
  }
  const willChange = /^will-change-(auto|scroll|contents|transform)$/.exec(utility);
  return willChange ? { property: 'will-change', value: willChange[1]! } : null;
}
