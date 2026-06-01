/**
 * Conflict groups for shorthands and directional utilities.
 *
 * Each array includes the group itself and every more specific group the utility
 * writes. The merge algorithm reads styles right to left, so this order lets a
 * later shorthand clear earlier sides while a later side keeps unrelated sides.
 */
export const DIRECTIONAL_CONFLICTS: Readonly<Record<string, readonly string[]>> = {
  p: ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe'],
  px: ['px', 'pl', 'pr', 'ps', 'pe'],
  py: ['py', 'pt', 'pb'],
  m: ['m', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'ms', 'me'],
  mx: ['mx', 'ml', 'mr', 'ms', 'me'],
  my: ['my', 'mt', 'mb'],
  inset: ['inset', 'inset-x', 'inset-y', 'top', 'right', 'bottom', 'left', 'start', 'end'],
  'inset-x': ['inset-x', 'left', 'right', 'start', 'end'],
  'inset-y': ['inset-y', 'top', 'bottom'],
  size: ['size', 'width', 'height'],
  gap: ['gap', 'row-gap', 'column-gap'],
  border: [
    'border',
    'border-x',
    'border-y',
    'border-top',
    'border-right',
    'border-bottom',
    'border-left',
    'border-inline-start',
    'border-inline-end',
  ],
  'border-width': [
    'border-width',
    'border-x',
    'border-y',
    'border-top',
    'border-right',
    'border-bottom',
    'border-left',
    'border-inline-start',
    'border-inline-end',
  ],
  'border-x': ['border-x', 'border-left', 'border-right', 'border-inline-start', 'border-inline-end'],
  'border-y': ['border-y', 'border-top', 'border-bottom'],
};
