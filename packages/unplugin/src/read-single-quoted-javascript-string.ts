/** Decodes the limited single-quoted string syntax emitted by Babel. */
export function readSingleQuotedJavaScriptString(literal: string): string {
  return literal.slice(1, -1).replace(/\\(['"\\bnfrtv])/g, (_match, escaped: string) => {
    const escapes: Readonly<Record<string, string>> = { b: '\b', n: '\n', f: '\f', r: '\r', t: '\t', v: '\v' };
    return escapes[escaped] ?? escaped;
  });
}
