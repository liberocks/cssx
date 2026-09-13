/** Represents the base64 alphabet used by source map VLQ encoding. */
const BASE64_VLQ_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encodes one signed integer as a base64 VLQ segment.
 *
 * @param value Signed integer to encode.
 * @returns The encoded source map segment.
 */
export function encodeVlq(value: number): string {
  let encoded = '';
  let remaining = value < 0 ? (-value << 1) | 1 : value << 1;
  do {
    let digit = remaining & 31;
    remaining >>>= 5;
    if (remaining) {
      digit |= 32;
    }
    encoded += BASE64_VLQ_ALPHABET[digit]!;
  } while (remaining);
  return encoded;
}
