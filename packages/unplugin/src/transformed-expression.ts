/** Extracts the transformed `sx` expression from the synthetic JavaScript module. */
export function transformedExpression(code: string): string {
  const prefix = 'const style = ';
  const start = code.indexOf(prefix) + prefix.length;
  const end = code.indexOf(';', start);
  return code.slice(start, end);
}
