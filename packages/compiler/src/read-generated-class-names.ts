/**
 * Validates a callback result and splits it into generated class names.
 *
 * @param candidate Source utility candidate.
 * @param value Class string returned by the caller callback.
 * @returns Safe non-empty class names.
 */
export function readGeneratedClassNames(candidate: string, value: string): readonly string[] {
  const classes = value.split(/\s+/).filter(Boolean);
  if (
    classes.length === 0 ||
    classes.some((className) => !/^(?:[A-Za-z_][A-Za-z0-9_-]*|[0-9][A-Za-z0-9_-]*)$/.test(className))
  ) {
    throw new Error(`CSSX received an unsafe generated class name for utility "${candidate}".`);
  }
  return classes;
}