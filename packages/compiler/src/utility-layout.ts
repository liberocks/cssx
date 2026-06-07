import { resolveThemeValue } from './theme';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';
import {
  resolveColorValue,
  resolveDimensionValue,
  resolveOpacityModifier,
  resolveSpacingValue,
  splitColorModifier,
} from './utility-resolvers';

/**
 * Compiles the responsive container utility from theme breakpoints.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Container declarations, or null when it is not the container utility.
 */
export function compileContainerUtility(utility: string, theme: CssxTheme): UtilityDeclaration[] | null {
  if (utility !== 'container') {
    return null;
  }
  const breakpoints = ['sm', 'md', 'lg', 'xl', '2xl'];
  const declarations: UtilityDeclaration[] = [{ property: 'width', value: '100%', semanticGroup: 'container' }];
  for (const breakpoint of breakpoints) {
    const value = resolveThemeValue(theme, `--breakpoint-${breakpoint}`);
    if (value) {
      declarations.push({
        property: 'max-width',
        value,
        atRule: `@media (width >= ${value})`,
        semanticGroup: 'container',
      });
    }
  }
  return declarations;
}

/**
 * Compiles core layout, scrolling, interaction, grid, and SVG utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
 * @returns Layout declarations, or null when unsupported.
 */
export function compileCoreLayoutUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | UtilityDeclaration[] | null {
  const exact: Readonly<Record<string, UtilityDeclaration>> = {
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
  const direct = exact[utility];
  if (direct) {
    return direct;
  }

  const overflow = /^(overflow|overflow-x|overflow-y)-(auto|hidden|clip|visible|scroll)$/.exec(utility);
  if (overflow) {
    return { property: overflow[1] ?? 'overflow', value: overflow[2] ?? '' };
  }
  const overscroll = /^(overscroll|overscroll-x|overscroll-y)-(auto|contain|none)$/.exec(utility);
  if (overscroll) {
    return {
      property:
        overscroll[1] === 'overscroll'
          ? 'overscroll-behavior'
          : `overscroll-behavior-${overscroll[1] === 'overscroll-x' ? 'x' : 'y'}`,
      value: overscroll[2] ?? '',
    };
  }
  const aspect = /^aspect-(\[[^\]]+\])$/.exec(utility);
  if (aspect) {
    return { property: 'aspect-ratio', value: (aspect[1] ?? '').slice(1, -1) };
  }
  const size = /^size-(.+)$/.exec(utility);
  if (size) {
    const value = resolveDimensionValue(size[1] ?? '', negative, theme, 'size');
    return value
      ? [
          { property: 'width', value },
          { property: 'height', value },
        ]
      : null;
  }
  const logicalInset = /^(start|end)-(.+)$/.exec(utility);
  if (logicalInset) {
    const value = resolveDimensionValue(logicalInset[2] ?? '', negative, theme, logicalInset[1] ?? '');
    return value ? { property: logicalInset[1] === 'start' ? 'inset-inline-start' : 'inset-inline-end', value } : null;
  }
  const cursor =
    /^cursor-(auto|default|pointer|wait|text|move|help|not-allowed|none|context-menu|progress|cell|crosshair|vertical-text|alias|copy|no-drop|grab|grabbing|all-scroll|col-resize|row-resize|n-resize|e-resize|s-resize|w-resize|ne-resize|nw-resize|se-resize|sw-resize|ew-resize|ns-resize|nesw-resize|nwse-resize|zoom-in|zoom-out)$/.exec(
      utility,
    );
  if (cursor) {
    return { property: 'cursor', value: cursor[1] ?? '' };
  }
