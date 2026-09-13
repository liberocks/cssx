import { compilePrefixedBreakUtility } from './compile-prefixed-break-utility';
import { compilePrefixedColumnsUtility } from './compile-prefixed-columns-utility';
import { compilePrefixedContentUtility } from './compile-prefixed-content-utility';
import { compilePrefixedLineClampUtility } from './compile-prefixed-line-clamp-utility';
import { compilePrefixedListImageUtility } from './compile-prefixed-list-image-utility';
import { compilePrefixedObjectUtility } from './compile-prefixed-object-utility';
import { compilePrefixedTabUtility } from './compile-prefixed-tab-utility';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles layout support utilities for columns, content, breaks, object position, tabs, list images, and clamping.
 *
 * @param utility Utility name without variants.
 * @returns Layout declaration(s), or null when unsupported.
 */
export function compilePrefixedLayoutUtility(utility: string): UtilityDeclaration | UtilityDeclaration[] | null {
  return (
    compilePrefixedColumnsUtility(utility) ??
    compilePrefixedContentUtility(utility) ??
    compilePrefixedBreakUtility(utility) ??
    compilePrefixedObjectUtility(utility) ??
    compilePrefixedTabUtility(utility) ??
    compilePrefixedListImageUtility(utility) ??
    compilePrefixedLineClampUtility(utility)
  );
}
