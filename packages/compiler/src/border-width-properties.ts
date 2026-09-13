/** Maps border-width axis suffixes to their physical or logical CSS sides. */
export const BORDER_WIDTH_PROPERTIES: Readonly<Record<string, readonly string[]>> = {
  x: ['border-left-width', 'border-right-width'],
  y: ['border-top-width', 'border-bottom-width'],
  t: ['border-top-width'],
  r: ['border-right-width'],
  b: ['border-bottom-width'],
  l: ['border-left-width'],
  s: ['border-inline-start-width'],
  e: ['border-inline-end-width'],
  bs: ['border-block-start-width'],
  be: ['border-block-end-width'],
};
