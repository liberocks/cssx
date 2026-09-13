import type { UtilityDeclaration } from './utility-types';

/** Fixed transition-property and timing declarations. */
export const EXACT_TRANSITION_DECLARATIONS: Readonly<Record<string, readonly UtilityDeclaration[]>> = {
  'transition-none': [{ property: 'transition-property', value: 'none' }],
  'transition-normal': [{ property: 'transition-behavior', value: 'normal' }],
  'transition-discrete': [{ property: 'transition-behavior', value: 'allow-discrete' }],
  transition: [
    {
      property: 'transition-property',
      value:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, -webkit-backdrop-filter, backdrop-filter',
    },
    { property: 'transition-duration', value: '150ms' },
    { property: 'transition-timing-function', value: 'cubic-bezier(.4, 0, .2, 1)' },
  ],
  'transition-all': [
    { property: 'transition-property', value: 'all' },
    { property: 'transition-duration', value: '150ms' },
    { property: 'transition-timing-function', value: 'cubic-bezier(.4, 0, .2, 1)' },
  ],
  'transition-colors': [
    {
      property: 'transition-property',
      value: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
    },
    { property: 'transition-duration', value: '150ms' },
    { property: 'transition-timing-function', value: 'cubic-bezier(.4, 0, .2, 1)' },
  ],
  'transition-opacity': [
    { property: 'transition-property', value: 'opacity' },
    { property: 'transition-duration', value: '150ms' },
    { property: 'transition-timing-function', value: 'cubic-bezier(.4, 0, .2, 1)' },
  ],
  'transition-shadow': [
    { property: 'transition-property', value: 'box-shadow' },
    { property: 'transition-duration', value: '150ms' },
    { property: 'transition-timing-function', value: 'cubic-bezier(.4, 0, .2, 1)' },
  ],
  'transition-transform': [
    { property: 'transition-property', value: 'transform, translate, scale, rotate' },
    { property: 'transition-duration', value: '150ms' },
    { property: 'transition-timing-function', value: 'cubic-bezier(.4, 0, .2, 1)' },
  ],
  'ease-linear': [{ property: 'transition-timing-function', value: 'linear' }],
  'ease-in': [{ property: 'transition-timing-function', value: 'cubic-bezier(.4, 0, 1, 1)' }],
  'ease-out': [{ property: 'transition-timing-function', value: 'cubic-bezier(0, 0, .2, 1)' }],
  'ease-in-out': [{ property: 'transition-timing-function', value: 'cubic-bezier(.4, 0, .2, 1)' }],
};
