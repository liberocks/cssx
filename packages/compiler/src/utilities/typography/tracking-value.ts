/**
 * Resolves a supported letter-spacing name.
 *
 * @param value Utility value.
 * @returns CSS letter-spacing value.
 */
export function trackingValue(value: string): string {
  const values: Readonly<Record<string, string>> = {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  };
  return values[value] ?? value;
}
