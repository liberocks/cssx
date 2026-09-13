/**
 * Finds custom properties that need CSS property registration.
 *
 * @param utility Utility name without variants or modifiers.
 * @returns Required property names.
 */
export function requiredPropertyNames(utility: string): readonly string[] {
  const part = /^scrollbar-(thumb|track)-/.exec(utility)?.[1];
  return part ? [`--cssx-scrollbar-${part}`] : [];
}