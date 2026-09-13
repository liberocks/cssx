import { escapeCssIdentifier } from './escape-css-identifier';

/** Returns the required atomic selector and stable composite aliases. */
export function classSelectors(
  className: string,
  selectorAliases: Readonly<Record<string, readonly string[]>>,
  includedClasses: ReadonlySet<string> | undefined,
): readonly string[] {
  const aliases = selectorAliases[className];
  if (!aliases?.length) {
    return !includedClasses || includedClasses.has(className) ? [`.${escapeCssIdentifier(className)}`] : [];
  }
  const names = new Set(aliases);
  if (!includedClasses || includedClasses.has(className)) {
    names.add(className);
  }
  return [...names].sort().map((name) => `.${escapeCssIdentifier(name)}`);
}