/**
 * Creates the registration rule for a generated color custom property.
 *
 * @param name Custom-property name.
 * @returns CSS property registration rule.
 */
export function propertyRegistration(name: string): string {
  return `@property ${name}{syntax:"<color>";inherits:true;initial-value:#0000;}`;
}
