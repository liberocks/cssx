import { rewriteThemeReferences } from './rewrite-theme-references';
import type { CssxTheme } from './theme-types';

/**
 * Serializes one referenced keyframe rule for the active theme output mode.
 *
 * @param theme Active resolved theme.
 * @param name Keyframe identifier.
 * @returns Rewritten keyframe CSS, or undefined when the name is unknown.
 */
export function serializeThemeKeyframe(theme: CssxTheme, name: string): string | undefined {
  const keyframe = theme.keyframes[name];
  return keyframe === undefined ? undefined : rewriteThemeReferences(theme, keyframe);
}
