/** Finds complete `sx(...)` calls without interpreting the surrounding template. */
export function findSxCalls(code: string): { readonly start: number; readonly end: number; readonly code: string }[] {
  const calls: { start: number; end: number; code: string }[] = [];
  const expression = /\bsx\s*\(/g;
  for (const match of code.matchAll(expression)) {
    const start = match.index!;
    const open = code.indexOf('(', start);
    let depth = 0;
    let quote = '';
    for (let index = open; index < code.length; index += 1) {
      const character = code[index]!;
      if (quote) {
        if (character === '\\') {
          index += 1;
        } else if (character === quote) {
          quote = '';
        }
        continue;
      }
      if (character === '"' || character === "'" || character === '`') {
        quote = character;
      } else if (character === '(') {
        depth += 1;
      } else if (character === ')' && --depth === 0) {
        calls.push({ start, end: index + 1, code: code.slice(start, index + 1) });
        expression.lastIndex = index + 1;
        break;
      }
    }
  }
  return calls;
}
