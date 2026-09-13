import type { parseTheme } from '@cssxio/compiler';
import { describeUtilityRecipe } from '@cssxio/compiler';

import { appendDeclaration } from './append-declaration';
import type { NativePlatform, NativeStyle, NativeStyleValue } from './native-types';
import { platformCandidate } from './platform-candidate';

/**
 * Compiles resolved utility candidates to a React Native style object.
 *
 * @param candidates Utility candidates from a compiled style map.
 * @param theme Parsed CSSX theme.
 * @param platform Target React Native platform.
 * @returns The compiled native style.
 */
export function compileCandidates(
  candidates: readonly string[],
  theme: ReturnType<typeof parseTheme>,
  platform: NativePlatform | undefined,
): NativeStyle {
  const style: Record<string, NativeStyleValue> = {};
  for (const source of candidates) {
    const candidate = platformCandidate(source, platform);
    if (candidate === null) {
      continue;
    }
    for (const atom of describeUtilityRecipe(candidate, theme).atoms) {
      for (const declaration of atom) {
        appendDeclaration(style, candidate, declaration);
      }
    }
  }
  return style;
}
