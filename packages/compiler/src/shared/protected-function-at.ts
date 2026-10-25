/** Finds url(), var(), or env() at an identifier boundary. */
export function protectedFunctionAt(source: string, index: number): string | null {
  if (index > 0 && /[A-Za-z0-9_-]/.test(source[index - 1]!)) {
    return null;
  }
  const match = /^(url|var|env)\(/i.exec(source.slice(index));
  return match?.[1] ?? null;
}
