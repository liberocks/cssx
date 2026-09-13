import type { UtilityDeclaration } from './utility-types';

/**
 * Builds declarations for one filter channel and its combined sink.
 *
 * @param property Target filter property.
 * @param variablePrefix Prefix for channel custom properties.
 * @param semanticPrefix Prefix for semantic groups.
 * @param sink Combined filter value.
 * @param channel Channel name.
 * @param value CSS filter function value.
 * @returns Channel and sink declarations.
 */
export function filterDeclarations(
  property: 'filter' | 'backdrop-filter',
  variablePrefix: string,
  semanticPrefix: string,
  sink: string,
  channel: string,
  value: string,
): UtilityDeclaration[] {
  const semanticGroup = `${semanticPrefix}${channel}`;
  const semanticConflicts = [semanticGroup, `${semanticPrefix}filter-none`];
  const declarations: UtilityDeclaration[] = [
    { property: `${variablePrefix}${channel}`, value, semanticGroup, semanticConflicts },
  ];
  if (property === 'backdrop-filter') {
    declarations.push({ property: '-webkit-backdrop-filter', value: sink, semanticGroup, semanticConflicts });
  }
  declarations.push({ property, value: sink, semanticGroup, semanticConflicts });
  return declarations;
}
