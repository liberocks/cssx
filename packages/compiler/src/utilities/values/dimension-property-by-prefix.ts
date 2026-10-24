/** Maps physical and logical dimension utility prefixes to CSS properties. */
export const DIMENSION_PROPERTY_BY_PREFIX: Readonly<Record<string, string>> = {
  w: 'width',
  h: 'height',
  'min-w': 'min-width',
  'max-w': 'max-width',
  'min-h': 'min-height',
  'max-h': 'max-height',
  inline: 'inline-size',
  'min-inline': 'min-inline-size',
  'max-inline': 'max-inline-size',
  block: 'block-size',
  'min-block': 'min-block-size',
  'max-block': 'max-block-size',
};
