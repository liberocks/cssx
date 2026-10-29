/** Recognizes CSSX class names already emitted by an earlier CSSX transform. */
export function isGeneratedClassNames(value: string): boolean {
  return /^(?:s[0-9A-Za-z]+x|d[0-9a-z]+x)(?:\s+(?:s[0-9A-Za-z]+x|d[0-9a-z]+x))*$/.test(value);
}
