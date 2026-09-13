import { CSSX_SHADOW_SINK } from './utility-effect-sinks';
import { resolveBorderWidthValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves ring width utilities and their shared shadow declarations.
 *
 * @param utility Utility name without variants.
 * @returns Ring width declarations, or null when another recipe applies.
 */
export function compileRingWidthUtility(utility: string): UtilityDeclaration[] | null {
  const width = utility === 'ring' ? '1px' : resolveBorderWidthValue(/^ring-(.+)$/.exec(utility)?.[1] ?? '');
  if (!width) {
    return null;
  }
  return [
    { property: '--cssx-ring-width', value: width, semanticGroup: 'ring-width' },
    {
      property: '--cssx-ring-shadow',
      value:
        '0 0 0 calc(var(--cssx-ring-width) + var(--cssx-ring-offset-width, 0px)) var(--cssx-ring-color, currentColor)',
      semanticGroup: 'ring-width',
    },
    { property: 'box-shadow', value: CSSX_SHADOW_SINK, semanticGroup: 'ring-width' },
  ];
}
