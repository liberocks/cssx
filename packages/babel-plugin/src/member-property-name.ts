import type * as babelTypes from '@babel/types';

/**
 * Reads a member property written with supported static syntax.
 *
 * It accepts dot identifiers and computed string literals. Other computed values return null.
 *
 * @param member Member expression to inspect.
 * @param t Babel node helpers.
 * @returns The static property name, or null when the property is dynamic.
 */
export function memberPropertyName(
  member: import('@babel/types').MemberExpression,
  t: typeof babelTypes,
): string | null {
  if (!member.computed && t.isIdentifier(member.property)) {
    return member.property.name;
  }
  if (member.computed && t.isStringLiteral(member.property)) {
    return member.property.value;
  }
  return null;
}
