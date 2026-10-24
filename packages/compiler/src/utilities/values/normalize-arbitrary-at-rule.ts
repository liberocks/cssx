/**
 * Validates and normalizes a supported arbitrary media or supports rule.
 *
 * @param value Arbitrary at-rule text without brackets.
 * @returns Normalized at-rule.
 * @throws When the rule type or condition is missing.
 */
export function normalizeArbitraryAtRule(value: string): string {
  const match = /^@(supports|media)\s*(.*)$/.exec(value);
  const kind = match?.[1];
  const condition = match?.[2]?.trim();
  if (!kind || !condition) {
    throw new Error(`Invalid CSSX arbitrary at-rule variant "[${value}]".`);
  }
  return `@${kind} ${condition}`;
}
