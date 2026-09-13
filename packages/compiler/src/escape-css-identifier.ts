/**
 * Escapes a class name for use as one CSS identifier.
 *
 * @param value Class name text to escape.
 * @returns CSS identifier that represents the input without ambiguity.
 */
export function escapeCssIdentifier(value: string): string {
  let output = '';
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    const character = value[index]!;
    if (index === 0 && code >= 48 && code <= 57) {
      output += `\\${code.toString(16)} `;
    } else if (
      code >= 128 ||
      code === 45 ||
      code === 95 ||
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122)
    ) {
      output += character;
    } else {
      output += `\\${character}`;
    }
  }
  return output;
}