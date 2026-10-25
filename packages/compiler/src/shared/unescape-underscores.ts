/** Decodes the explicit literal-underscore escape without aliasing spaces. */
export function unescapeUnderscores(value: string): string {
  return value.replaceAll('\\_', '_');
}
