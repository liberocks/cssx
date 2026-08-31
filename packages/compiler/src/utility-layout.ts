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
    return { property: overflow[1]!, value: overflow[2]! };
  }
  const overscroll = /^(overscroll|overscroll-x|overscroll-y)-(auto|contain|none)$/.exec(utility);
  if (overscroll) {
    return {
      property:
        overscroll[1] === 'overscroll'
          ? 'overscroll-behavior'
          : `overscroll-behavior-${overscroll[1] === 'overscroll-x' ? 'x' : 'y'}`,
      value: overscroll[2]!,
    };
  }
  const aspect = /^aspect-(\[[^\]]+\])$/.exec(utility);
  if (aspect) {
    return { property: 'aspect-ratio', value: aspect[1]!.slice(1, -1) };
  }
  const size = /^size-(.+)$/.exec(utility);
  if (size) {
    const value = resolveDimensionValue(size[1]!, negative, theme, 'size');
    return value
      ? [
          { property: 'width', value },
          { property: 'height', value },
        ]
      : null;
  }
  const logicalInset = /^(start|end)-(.+)$/.exec(utility);
  if (logicalInset) {
    const value = resolveDimensionValue(logicalInset[2]!, negative, theme, logicalInset[1]!);
    return value ? { property: logicalInset[1] === 'start' ? 'inset-inline-start' : 'inset-inline-end', value } : null;
  }
  const cursor =
    /^cursor-(auto|default|pointer|wait|text|move|help|not-allowed|none|context-menu|progress|cell|crosshair|vertical-text|alias|copy|no-drop|grab|grabbing|all-scroll|col-resize|row-resize|n-resize|e-resize|s-resize|w-resize|ne-resize|nw-resize|se-resize|sw-resize|ew-resize|ns-resize|nesw-resize|nwse-resize|zoom-in|zoom-out)$/.exec(
      utility,
    );
  if (cursor) {
    return { property: 'cursor', value: cursor[1]! };
  }
  const willChange = /^will-change-(auto|scroll|contents|transform)$/.exec(utility);
  if (willChange) {
    return { property: 'will-change', value: willChange[1]! };
  }
  const gridFlow = /^grid-flow-(row|col|row-dense|col-dense)$/.exec(utility);
  if (gridFlow) {
    return { property: 'grid-auto-flow', value: gridFlow[1]!.replace('-', ' ') };
  }
  const autoTracks = /^auto-(cols|rows)-(auto|min|max|fr)$/.exec(utility);
  if (autoTracks) {
    const values: Readonly<Record<string, string>> = {
      auto: 'auto',
      min: 'min-content',
      max: 'max-content',
      fr: 'minmax(0, 1fr)',
    };
    return {
      property: autoTracks[1] === 'cols' ? 'grid-auto-columns' : 'grid-auto-rows',
      value: values[autoTracks[2]!]!,
    };
  }
  const scroll = /^scroll-(mx|my|mt|mr|mb|ml|m|px|py|pt|pr|pb|pl|p)-(.+)$/.exec(utility);
  if (scroll) {
    const prefix = scroll[1]!;
    const value = resolveSpacingValue(scroll[2]!, negative, theme);
    if (!value) {
      return null;
    }
    const properties: Readonly<Record<string, readonly string[]>> = {
      m: ['scroll-margin'],
      mx: ['scroll-margin-left', 'scroll-margin-right'],
      my: ['scroll-margin-top', 'scroll-margin-bottom'],
      mt: ['scroll-margin-top'],
      mr: ['scroll-margin-right'],
      mb: ['scroll-margin-bottom'],
      ml: ['scroll-margin-left'],
      p: ['scroll-padding'],
      px: ['scroll-padding-left', 'scroll-padding-right'],
      py: ['scroll-padding-top', 'scroll-padding-bottom'],
      pt: ['scroll-padding-top'],
      pr: ['scroll-padding-right'],
      pb: ['scroll-padding-bottom'],
      pl: ['scroll-padding-left'],
    };
    return properties[prefix]!.map((property) => ({ property, value }));
  }
  const strokeWidth = /^stroke-(\d+|\[[^\]]+\])$/.exec(utility);
  if (strokeWidth) {
    const raw = strokeWidth[1]!;
    return { property: 'stroke-width', value: raw.startsWith('[') ? raw.slice(1, -1) : raw };
  }
  const scrollbarColor = /^scrollbar-(thumb|track)-(.+)$/.exec(utility);
  if (scrollbarColor) {
    const part = scrollbarColor[1]!;
    const modifier = splitColorModifier(scrollbarColor[2]!);
    const resolved = resolveColorValue(modifier.value, theme);
    if (!resolved) {
      return null;
    }
    const opacity = modifier.opacity === undefined ? null : resolveOpacityModifier(modifier.opacity);
    if (modifier.opacity !== undefined && opacity === null) {
      return null;
    }
    const value = opacity === null ? resolved : `color-mix(in srgb, ${resolved} ${opacity}%, transparent)`;
    const semanticGroup = `scrollbar-${part}`;
    return [
      { property: `--cssx-scrollbar-${part}`, value, semanticGroup },
      {
        property: 'scrollbar-color',
        value: 'var(--cssx-scrollbar-thumb, #0000) var(--cssx-scrollbar-track, #0000)',
        semanticGroup,
      },
    ];
  }
  return null;
}
