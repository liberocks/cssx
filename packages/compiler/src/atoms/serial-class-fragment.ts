/** Case-sensitive digits used for compact serial class names. */
const SERIAL_CLASS_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Encodes a non-negative counter value in the serial class-name alphabet.
 *
 * @param value Counter value to encode.
 * @returns A base-62 serial fragment, where `10` follows uppercase `Z`.
 */
export function serialClassFragment(value: number): string {
  let remaining = value;
  let fragment = '';
  const base = SERIAL_CLASS_ALPHABET.length;
  do {
    fragment = `${SERIAL_CLASS_ALPHABET[remaining % base]!}${fragment}`;
    remaining = Math.floor(remaining / base);
  } while (remaining > 0);
  return fragment;
}
