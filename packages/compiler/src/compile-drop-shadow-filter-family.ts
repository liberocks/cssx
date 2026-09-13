import { filterDeclarations } from './filter-declarations';
import type { UtilityDeclaration } from './utility-types';

/** Named drop-shadow values used by filter utilities. */
const DROP_SHADOW_VALUES: Readonly<Record<string, string>> = {
  DEFAULT: '0 1px 2px rgb(0 0 0 / .1)',
  none: '0 0 #0000',
  xs: '0 1px 1px rgb(0 0 0 / .05)',
  sm: '0 1px 2px rgb(0 0 0 / .15)',
  md: '0 3px 3px rgb(0 0 0 / .12)',
  lg: '0 4px 4px rgb(0 0 0 / .15)',
  xl: '0 9px 7px rgb(0 0 0 / .1)',
  '2xl': '0 25px 25px rgb(0 0 0 / .15)',
};

/**
 * Resolves built-in and arbitrary drop-shadow filter values.
 *
 * @param utility Utility name within the family.
 * @param property Target CSS filter property.
 * @param variablePrefix Prefix for channel custom properties.
 * @param semanticPrefix Prefix for semantic groups.
 * @param sink Combined filter value.
 * @returns Drop-shadow declarations, or null when unsupported.
 */
export function compileDropShadowFilterFamily(
  utility: string,
  property: 'filter' | 'backdrop-filter',
  variablePrefix: string,
  semanticPrefix: string,
  sink: string,
): UtilityDeclaration[] | null {
  const dropShadow = /^drop-shadow(?:-(.+))?$/.exec(utility);
  if (!dropShadow || property !== 'filter') {
    return null;
  }
  const raw = dropShadow[1] ?? 'DEFAULT';
  const value = raw.startsWith('[') && raw.endsWith(']') ? raw.slice(1, -1) : DROP_SHADOW_VALUES[raw];
  return value
    ? filterDeclarations(property, variablePrefix, semanticPrefix, sink, 'drop-shadow', `drop-shadow(${value})`)
    : null;
}
