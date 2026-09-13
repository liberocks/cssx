import { resolveIntrinsicSize } from './resolve-intrinsic-size';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves intrinsic containment size utilities against the active theme.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns The intrinsic-size declaration, or null when unsupported.
 */
export function compileIntrinsicContainUtility(utility: string, theme: CssxTheme): UtilityDeclaration | null {
  const intrinsic = /^contain-intrinsic-(size|inline-size|block-size)-(.+)$/.exec(utility);
  if (!intrinsic) {
    return null;
  }
  const suffix = intrinsic[1]!;
  const property = `contain-intrinsic-${suffix}`;
  const value = resolveIntrinsicSize(intrinsic[2]!, property, theme);
  return value ? { property, value } : null;
}
