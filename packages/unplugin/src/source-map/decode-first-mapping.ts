/**
 * Decodes the first source-map VLQ segment into signed integer values.
 *
 * @param mappings Source-map mappings string.
 * @returns Decoded values from the first segment.
 */
export function decodeFirstMapping(mappings: string): number[] {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const values: number[] = [];
  let value = 0;
  let shift = 0;
  const firstSegment = mappings.split(',', 1).join('');
  for (const character of firstSegment) {
    const digit = alphabet.indexOf(character);
    value |= (digit & 31) << shift;
    if (digit & 32) {
      shift += 5;
      continue;
    }
    values.push(value & 1 ? -(value >> 1) : value >> 1);
    value = 0;
    shift = 0;
  }
  return values;
}
