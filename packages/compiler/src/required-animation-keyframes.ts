import { resolveAnimationThemeReferences } from './resolve-animation-theme-references';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/**
 * Finds keyframe resources referenced by emitted animation declarations.
 *
 * @param declarations Compiled utility declarations.
 * @param theme Active resolved theme.
 * @returns Referenced keyframe names in stable order.
 */
export function requiredAnimationKeyframes(
  declarations: readonly UtilityDeclaration[],
  theme: CssxTheme,
): readonly string[] {
  const required = new Set<string>();
  for (const declaration of declarations) {
    if (declaration.property === 'animation-name') {
      for (const name of declaration.value.split(',').map((part) => part.trim())) {
        if (theme.keyframes[name]) {
          required.add(name);
        }
      }
    } else if (declaration.property === 'animation') {
      const animationValue = resolveAnimationThemeReferences(declaration.value, theme);
      for (const name of Object.keys(theme.keyframes)) {
        const escapedName = name.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`(?:^|[\\s,])${escapedName}(?=$|[\\s,])`).test(animationValue)) {
          required.add(name);
        }
      }
    }
  }
  return [...required].sort();
}