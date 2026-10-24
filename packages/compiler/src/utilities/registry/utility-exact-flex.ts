import type { UtilityDeclaration } from './utility-types';

/** Exact flexbox utility declarations keyed by their complete candidate. */
export const EXACT_FLEX_DECLARATIONS: Readonly<Record<string, readonly UtilityDeclaration[]>> = {
  'flex-row': [{ property: 'flex-direction', value: 'row' }],
  'flex-row-reverse': [{ property: 'flex-direction', value: 'row-reverse' }],
  'flex-col': [{ property: 'flex-direction', value: 'column' }],
  'flex-col-reverse': [{ property: 'flex-direction', value: 'column-reverse' }],
  'flex-wrap': [{ property: 'flex-wrap', value: 'wrap' }],
  'flex-wrap-reverse': [{ property: 'flex-wrap', value: 'wrap-reverse' }],
  'flex-nowrap': [{ property: 'flex-wrap', value: 'nowrap' }],
  'flex-auto': [{ property: 'flex', value: '1 1 auto' }],
  'flex-initial': [{ property: 'flex', value: '0 1 auto' }],
  'flex-none': [{ property: 'flex', value: 'none' }],
  grow: [{ property: 'flex-grow', value: '1' }],
  'grow-0': [{ property: 'flex-grow', value: '0' }],
  shrink: [{ property: 'flex-shrink', value: '1' }],
  'shrink-0': [{ property: 'flex-shrink', value: '0' }],
};
