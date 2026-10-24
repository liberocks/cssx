import type { UtilityDeclaration } from './utility-types';

/** Fixed border-radius and border-width declarations. */
export const EXACT_BORDER_DECLARATIONS: Readonly<Record<string, readonly UtilityDeclaration[]>> = {
  'rounded-none': [{ property: 'border-radius', value: '0' }],
  rounded: [{ property: 'border-radius', value: '0.25rem' }],
  'rounded-sm': [{ property: 'border-radius', value: '0.125rem' }],
  'rounded-md': [{ property: 'border-radius', value: '0.375rem' }],
  'rounded-lg': [{ property: 'border-radius', value: '0.5rem' }],
  'rounded-xl': [{ property: 'border-radius', value: '0.75rem' }],
  'rounded-2xl': [{ property: 'border-radius', value: '1rem' }],
  'rounded-full': [{ property: 'border-radius', value: '9999px' }],
  border: [{ property: 'border-width', value: '1px' }],
  'border-0': [{ property: 'border-width', value: '0' }],
  'border-2': [{ property: 'border-width', value: '2px' }],
  'border-4': [{ property: 'border-width', value: '4px' }],
  'border-8': [{ property: 'border-width', value: '8px' }],
  'border-x': [
    { property: 'border-left-width', value: '1px' },
    { property: 'border-right-width', value: '1px' },
  ],
  'border-y': [
    { property: 'border-top-width', value: '1px' },
    { property: 'border-bottom-width', value: '1px' },
  ],
  'border-t': [{ property: 'border-top-width', value: '1px' }],
  'border-r': [{ property: 'border-right-width', value: '1px' }],
  'border-b': [{ property: 'border-bottom-width', value: '1px' }],
  'border-l': [{ property: 'border-left-width', value: '1px' }],
};
