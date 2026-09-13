import { resolveGradientPosition } from './resolve-gradient-position';
import type { CssxTheme } from './theme';
import { resolveColorValue, resolveOpacityModifier, splitColorModifier } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

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
