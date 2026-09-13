/**
 * Checks whether arbitrary text is a supported background image.
 *
 * @param value Arbitrary value without brackets.
 * @returns Whether the value is an image expression.
 */
export function isBackgroundImageValue(value: string): boolean {
  return (
    value.startsWith('image:') || /^(?:url|linear-gradient|radial-gradient|conic-gradient|image-set)\(/.test(value)
  );
}
