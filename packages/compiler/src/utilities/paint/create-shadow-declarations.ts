import { CSSX_SHADOW_SINK } from '../registry/utility-effect-sinks';
import type { UtilityDeclaration } from '../registry/utility-types';

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
