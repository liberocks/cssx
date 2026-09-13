import type { UtilityDeclaration } from './utility-types';

/** Exact utility declarations for the core layout compiler. */
const EXACT_CORE_LAYOUT: Readonly<Record<string, UtilityDeclaration>> = {
  isolate: { property: 'isolation', value: 'isolate' },
  'isolation-auto': { property: 'isolation', value: 'auto' },
  'aspect-auto': { property: 'aspect-ratio', value: 'auto' },
  'aspect-square': { property: 'aspect-ratio', value: '1 / 1' },
  'aspect-video': { property: 'aspect-ratio', value: '16 / 9' },
  'object-contain': { property: 'object-fit', value: 'contain' },
  'object-cover': { property: 'object-fit', value: 'cover' },
  'object-fill': { property: 'object-fit', value: 'fill' },
  'object-none': { property: 'object-fit', value: 'none' },
  'object-scale-down': { property: 'object-fit', value: 'scale-down' },
  'touch-auto': { property: 'touch-action', value: 'auto' },
  'touch-none': { property: 'touch-action', value: 'none' },
  'touch-manipulation': { property: 'touch-action', value: 'manipulation' },
  'touch-pan-x': { property: 'touch-action', value: 'pan-x' },
  'touch-pan-y': { property: 'touch-action', value: 'pan-y' },
  'touch-pinch-zoom': { property: 'touch-action', value: 'pinch-zoom' },
};

/**
 * Resolves exact-name core layout declarations.
 *
 * @param utility Utility name without variants.
 * @returns The exact declaration, or null when the utility is not in the table.
 */
export function compileCoreLayoutExactUtility(utility: string): UtilityDeclaration | null {
  return EXACT_CORE_LAYOUT[utility] ?? null;
}
