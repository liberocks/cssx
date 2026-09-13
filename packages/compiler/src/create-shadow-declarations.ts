import type { UtilityDeclaration } from './utility-types';

/** Shared box-shadow value that combines shadow and ring channels. */
const CSSX_SHADOW_SINK =
  'var(--cssx-shadow, 0 0 #0000), var(--cssx-ring-offset-shadow, 0 0 #0000), var(--cssx-ring-shadow, 0 0 #0000)';

/**
 * Builds the custom-property and sink declarations for one shadow value.
 *
 * @param value CSS shadow value.
 * @returns Shadow declarations that remain compatible with ring utilities.
 */
export function createShadowDeclarations(value: string): readonly UtilityDeclaration[] {
  return [
    { property: '--cssx-shadow', value, semanticGroup: 'shadow' },
    { property: 'box-shadow', value: CSSX_SHADOW_SINK, semanticGroup: 'shadow' },
  ];
}
