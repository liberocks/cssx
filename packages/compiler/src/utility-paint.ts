import type { CssxTheme } from './theme';
import {
  isBackgroundImageValue,
  isLengthArbitraryValue,
  resolveArbitraryCssValue,
  resolveColorValue,
  resolveOpacityModifier,
  resolveSpacingValue,
  splitColorModifier,
} from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves utility-only color keywords and theme colors.
 *
 * @param value Color utility value.
 * @param theme Active resolved theme.
 * @returns CSS color, or null when unknown.
 */
export function resolveUtilityColor(value: string, theme: CssxTheme): string | null {
  if (value === 'current') {
    return 'currentColor';
  }
  if (value === 'inherit') {
    return 'inherit';
  }
  return resolveColorValue(value, theme);
}

/**
 * Compiles gradient image, stop-color, and stop-position utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the gradient angle is negated.
 * @param theme Active resolved theme.
 * @returns Gradient declarations, or null when unsupported.
 */
export function compileGradientUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration[] | null {
  const interpolation = (raw: string | undefined): string => {
    if (!raw) {
      return '';
    }
    if (raw === 'longer' || raw === 'shorter' || raw === 'increasing' || raw === 'decreasing') {
      return `in oklch ${raw} hue `;
    }
    return `in ${raw} `;
  };
  const direction =
    /^bg-linear-to-(t|tr|r|br|b|bl|l|tl)(?:\/(srgb|oklch|oklab|hsl|longer|shorter|increasing|decreasing))?$/.exec(
      utility,
    );
  if (direction) {
    const directions: Readonly<Record<string, string>> = {
      t: 'to top',
      tr: 'to top right',
      r: 'to right',
      br: 'to bottom right',
      b: 'to bottom',
      bl: 'to bottom left',
      l: 'to left',
      tl: 'to top left',
    };
    const value = directions[direction[1]!];
    return [
      {
        property: 'background-image',
        value: `linear-gradient(${interpolation(direction[2])}${value}, var(--cssx-gradient-via-stops, var(--cssx-gradient-stops)))`,
        semanticGroup: 'background-image',
      },
    ];
  }

  const radial = /^bg-radial(?:\/(srgb|oklch|oklab|hsl|longer|shorter|increasing|decreasing))?$/.exec(utility);
  if (radial) {
    return [
      {
        property: 'background-image',
        value: `radial-gradient(${interpolation(radial[1])}var(--cssx-gradient-via-stops, var(--cssx-gradient-stops)))`,
        semanticGroup: 'background-image',
      },
    ];
  }

  const conic =
    /^bg-conic(?:-(\d+|\[[^\]]+\]))?(?:\/(srgb|oklch|oklab|hsl|longer|shorter|increasing|decreasing))?$/.exec(utility);
  if (conic) {
    const rawAngle = conic[1];
    const angle = rawAngle
      ? rawAngle.startsWith('[')
        ? rawAngle.slice(1, -1)
        : `${negative ? '-' : ''}${rawAngle}deg`
      : '';
    return [
      {
        property: 'background-image',
        value: `conic-gradient(from ${angle || '0deg'} ${interpolation(conic[2])}at center, var(--cssx-gradient-via-stops, var(--cssx-gradient-stops)))`,
        semanticGroup: 'background-image',
      },
    ];
  }

  const angle = /^bg-linear-(\d+|\[[^\]]+\])(?:\/(srgb|oklch|oklab|hsl|longer|shorter|increasing|decreasing))?$/.exec(
    utility,
  );
  if (angle) {
    const rawAngle = angle[1]!;
    const value = rawAngle.startsWith('[') ? rawAngle.slice(1, -1) : `${negative ? '-' : ''}${rawAngle}deg`;
    return [
      {
        property: 'background-image',
        value: `linear-gradient(${interpolation(angle[2])}${value}, var(--cssx-gradient-via-stops, var(--cssx-gradient-stops)))`,
        semanticGroup: 'background-image',
      },
    ];
  }

  const stop = /^(from|via|to)-(.+)$/.exec(utility);
  if (!stop) {
    return null;
  }
  const role = stop[1]!;
  const raw = stop[2]!;
  const semanticGroup = `gradient-${role}`;
  const position = resolveGradientPosition(raw);
  if (position) {
    return [{ property: `--cssx-gradient-${role}-position`, value: position, semanticGroup }];
  }

  const modifier = splitColorModifier(raw);
  const resolved = resolveColorValue(modifier.value, theme);
  if (!resolved) {
    return null;
  }
  const opacity = modifier.opacity === undefined ? null : resolveOpacityModifier(modifier.opacity);
  if (modifier.opacity !== undefined && opacity === null) {
    return null;
  }
  const color = opacity === null ? resolved : `color-mix(in srgb, ${resolved} ${opacity}%, transparent)`;
  const declarations: UtilityDeclaration[] = [{ property: `--cssx-gradient-${role}`, value: color, semanticGroup }];
  if (role === 'from') {
    declarations.push({
      property: '--cssx-gradient-stops',
      value:
        'var(--cssx-gradient-from) var(--cssx-gradient-from-position,), var(--cssx-gradient-to, transparent) var(--cssx-gradient-to-position,)',
      semanticGroup,
    });
  } else if (role === 'via') {
    declarations.push({
      property: '--cssx-gradient-via-stops',
      value:
        'var(--cssx-gradient-from) var(--cssx-gradient-from-position,), var(--cssx-gradient-via) var(--cssx-gradient-via-position,), var(--cssx-gradient-to, transparent) var(--cssx-gradient-to-position,)',
      semanticGroup,
    });
  }
  return declarations;
}

/**
 * Resolves a bounded percentage gradient position.
 *
 * @param value Utility value.
 * @returns CSS percentage, or null when invalid.
 */
export function resolveGradientPosition(value: string): string | null {
  const raw = value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value;
  if (!/^\d+(?:\.\d+)?%$/.test(raw)) {
    return null;
  }
  const position = Number(raw.slice(0, -1));
  return position >= 0 && position <= 100 ? raw : null;
}

/**
 * Compiles foreground, background, border, and SVG color utilities.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Color declaration, or null when unsupported.
 */
export function compileColorUtility(
  utility: string,
  theme: CssxTheme,
): UtilityDeclaration | UtilityDeclaration[] | null {
  const match = /^(bg|text|border(?:-(x|y|s|e|bs|be|t|r|b|l))?|accent|caret|fill|stroke)-(.+)$/.exec(utility);
  if (!match) {
    return null;
  }
  const family = match[1]!;
  const modifier = splitColorModifier(match[3]!);
  const value = modifier.value;
  if (family === 'text' && /^(xs|sm|base|lg|xl|\d+xl)$/.test(value)) {
    return null;
  }
  if (family === 'text' && value.startsWith('[') && value.endsWith(']')) {
    const arbitrary = value.slice(1, -1);
    if (isLengthArbitraryValue(arbitrary)) {
      return { property: 'font-size', value: arbitrary.replace(/^(?:length|size):/, '') };
    }
  }
  if (family === 'bg' && value.startsWith('[') && value.endsWith(']')) {
    const arbitrary = value.slice(1, -1);
    if (isBackgroundImageValue(arbitrary)) {
      return { property: 'background-image', value: arbitrary.replace(/^image:/, '') };
    }
  }
  const resolved = resolveUtilityColor(value, theme);
  if (!resolved) {
    return null;
  }
  const opacity = modifier.opacity === undefined ? null : resolveOpacityModifier(modifier.opacity);
  if (modifier.opacity !== undefined && opacity === null) {
    return null;
  }
  const color = opacity === null ? resolved : `color-mix(in srgb, ${resolved} ${opacity}%, transparent)`;
  const properties: Readonly<Record<string, readonly string[]>> = {
    bg: ['background-color'],
    text: ['color'],
    border: ['border-color'],
    'border-x': ['border-left-color', 'border-right-color'],
    'border-y': ['border-top-color', 'border-bottom-color'],
    'border-s': ['border-inline-start-color'],
    'border-e': ['border-inline-end-color'],
    'border-bs': ['border-block-start-color'],
    'border-be': ['border-block-end-color'],
    'border-t': ['border-top-color'],
    'border-r': ['border-right-color'],
    'border-b': ['border-bottom-color'],
    'border-l': ['border-left-color'],
    accent: ['accent-color'],
    caret: ['caret-color'],
    fill: ['fill'],
    stroke: ['stroke'],
  };
  const propertiesForFamily = properties[family];
  return propertiesForFamily!.map((property) => ({ property, value: color }));
}

/**
 * Compiles text decoration offset, thickness, style, and color utilities.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Decoration declaration, or null when unsupported.
 */
export function compileTextDecorationUtility(utility: string, theme: CssxTheme): UtilityDeclaration | null {
  const offset = /^underline-offset-(auto|\d+|\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (offset) {
    const raw = offset[1]!;
    const value =
      raw === 'auto'
        ? raw
        : raw.startsWith('(')
          ? resolveArbitraryCssValue(raw)
          : resolveSpacingValue(raw, false, theme);
    return {
      property: 'text-underline-offset',
      value: value ?? resolveArbitraryCssValue(raw),
    };
  }
  const decoration = /^decoration-(.+)$/.exec(utility);
  if (!decoration) {
    return null;
  }
  const raw = decoration[1]!;
  if (/^(solid|double|dotted|dashed|wavy)$/.test(raw)) {
    return { property: 'text-decoration-style', value: raw };
  }
  if (/^(auto|from-font|\d+)$/.test(raw)) {
    return { property: 'text-decoration-thickness', value: raw === 'auto' || raw === 'from-font' ? raw : `${raw}px` };
  }
  if (raw.startsWith('[') || raw.startsWith('(')) {
    return { property: 'text-decoration-thickness', value: resolveArbitraryCssValue(raw) };
  }
  const color = resolveColorValue(raw, theme);
  return color ? { property: 'text-decoration-color', value: color } : null;
}
