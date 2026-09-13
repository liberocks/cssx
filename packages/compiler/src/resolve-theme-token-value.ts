/**
 * Recursively inlines token references while detecting missing and circular values.
 *
 * @param tokens Available theme tokens.
 * @param value Token value to resolve.
 * @param seen Tokens already visited on this resolution path.
 * @returns Fully resolved token value.
 */
export function resolveThemeTokenValue(
  tokens: Readonly<Record<string, string>>,
  value: string,
  seen: ReadonlySet<string>,
): string {
  return value.replace(/var\((--[a-z0-9-]+)\)/gi, (_match, reference: string) => {
    if (seen.has(reference)) {
      throw new Error(`Circular CSSX theme reference involving ${reference}.`);
    }
    const referenced = tokens[reference];
    if (referenced === undefined || referenced === 'initial') {
      throw new Error(`Unknown CSSX theme token ${reference}.`);
    }
    return resolveThemeTokenValue(tokens, referenced, new Set([...seen, reference]));
  });
}
