/** Finds the opening quote delimiter of the attribute containing a template expression. */
export function templateAttributeQuote(source: string, expressionStart: number): '"' | "'" | undefined {
  let tagStart = -1;
  let attributeQuote: '"' | "'" | undefined;
  for (let index = 0; index < expressionStart; index++) {
    const character = source[index];
    if (attributeQuote) {
      if (character === attributeQuote) {
        attributeQuote = undefined;
      }
      continue;
    }
    if (character === '<' && /[A-Za-z]/.test(source[index + 1] as string)) {
      tagStart = index;
      continue;
    }
    if (tagStart === -1) {
      continue;
    }
    if (character === '>') {
      tagStart = -1;
    } else if (character === '"' || character === "'") {
      attributeQuote = character;
    }
  }
  return attributeQuote;
}
