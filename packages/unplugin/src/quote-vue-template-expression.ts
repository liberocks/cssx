import { readSingleQuotedJavaScriptString } from './read-single-quoted-javascript-string';

/** Requotes generated JavaScript strings so transformed code remains valid inside a Vue attribute. */
export function quoteVueTemplateExpression(expression: string, attributeQuote: '"' | "'" | undefined): string {
  if (!attributeQuote) {
    return expression;
  }
  const quote = attributeQuote === '"' ? "'" : '"';
  return expression.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, (literal) => {
    const value = literal[0] === '"' ? JSON.parse(literal) : readSingleQuotedJavaScriptString(literal);
    const json = JSON.stringify(value);
    return quote === '"' ? json : `'${json.slice(1, -1).replaceAll("'", "\\'")}'`;
  });
}
