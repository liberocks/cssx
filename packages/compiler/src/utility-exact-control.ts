import type { UtilityDeclaration } from './utility-types';

/** Fixed form-control, color-scheme, and SVG declarations. */
export const EXACT_CONTROL_DECLARATIONS: Readonly<Record<string, readonly UtilityDeclaration[]>> = {
  'forced-color-adjust-auto': [{ property: 'forced-color-adjust', value: 'auto' }],
  'forced-color-adjust-none': [{ property: 'forced-color-adjust', value: 'none' }],
  'accent-auto': [{ property: 'accent-color', value: 'auto' }],
  'caret-auto': [{ property: 'caret-color', value: 'auto' }],
  'fill-none': [{ property: 'fill', value: 'none' }],
  'stroke-none': [{ property: 'stroke', value: 'none' }],
  'scheme-normal': [{ property: 'color-scheme', value: 'normal' }],
  'scheme-dark': [{ property: 'color-scheme', value: 'dark' }],
  'scheme-light': [{ property: 'color-scheme', value: 'light' }],
  'scheme-light-dark': [{ property: 'color-scheme', value: 'light dark' }],
  'scheme-only-dark': [{ property: 'color-scheme', value: 'only dark' }],
  'scheme-only-light': [{ property: 'color-scheme', value: 'only light' }],
};
