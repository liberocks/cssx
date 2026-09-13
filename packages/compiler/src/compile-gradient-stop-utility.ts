import { resolveGradientPosition } from './resolve-gradient-position';
import type { CssxTheme } from './theme';
import { resolveColorValue, resolveOpacityModifier, splitColorModifier } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves gradient stop positions and colors.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Gradient stop declarations, or null when unsupported.
 */
export function compileGradientStopUtility(utility: string, theme: CssxTheme): UtilityDeclaration[] | null {
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
