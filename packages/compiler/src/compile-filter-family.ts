import { compileDropShadowFilterFamily } from './compile-drop-shadow-filter-family';
import { compileFilterNoneFamily } from './compile-filter-none-family';
import { compileHueRotateFilterFamily } from './compile-hue-rotate-filter-family';
import { compileSimpleFilterFamily } from './compile-simple-filter-family';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles one configurable filter family from independent CSS channels.
 *
 * @param utility Utility name to compile.
 * @param negative Whether the value is negated.
 * @param property Target CSS filter property.
 * @param variablePrefix Prefix for channel custom properties.
 * @param semanticPrefix Prefix for semantic groups.
 * @param sink Combined filter value.
 * @param includesOpacity Whether this family supports opacity.
 * @returns Filter declarations, or null when unsupported.
 */
export function compileFilterFamily(
  utility: string,
  negative: boolean,
  property: 'filter' | 'backdrop-filter',
  variablePrefix: string,
  semanticPrefix: string,
  sink: string,
  includesOpacity: boolean,
): UtilityDeclaration[] | null {
  return (
    compileFilterNoneFamily(utility, property, semanticPrefix) ??
    compileSimpleFilterFamily(utility, property, variablePrefix, semanticPrefix, sink, includesOpacity) ??
    compileHueRotateFilterFamily(utility, negative, property, variablePrefix, semanticPrefix, sink) ??
    compileDropShadowFilterFamily(utility, property, variablePrefix, semanticPrefix, sink)
  );
}
