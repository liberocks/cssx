import type { NativePlatform } from './native-types';

/**
 * Resolves a React Native platform-prefixed utility or rejects a browser variant.
 *
 * @param source Candidate utility source.
 * @param platform Target React Native platform.
 * @returns A platform-applicable candidate, or null when it targets another platform.
 */
export function platformCandidate(source: string, platform: NativePlatform | undefined): string | null {
  const match = /^(ios|android):(.*)$/.exec(source);
  if (match) {
    return match[1] === platform ? match[2]! : null;
  }
  if (!source.startsWith('[') && source.includes(':')) {
    throw new Error(`CSSX React Native cannot represent the variant in "${source}".`);
  }
  return source;
}
