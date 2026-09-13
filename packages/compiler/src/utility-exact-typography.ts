import type { UtilityDeclaration } from './utility-types';

/** Exact fixed typography declarations keyed by their complete candidate. */
export const EXACT_TYPOGRAPHY_DECLARATIONS: Readonly<Record<string, readonly UtilityDeclaration[]>> = {
  'font-thin': [{ property: 'font-weight', value: '100' }],
  'font-extralight': [{ property: 'font-weight', value: '200' }],
  'font-light': [{ property: 'font-weight', value: '300' }],
  'font-normal': [{ property: 'font-weight', value: '400' }],
  'font-medium': [{ property: 'font-weight', value: '500' }],
  'font-semibold': [{ property: 'font-weight', value: '600' }],
  'font-bold': [{ property: 'font-weight', value: '700' }],
  'font-extrabold': [{ property: 'font-weight', value: '800' }],
  'font-black': [{ property: 'font-weight', value: '900' }],
  'font-sans': [
    {
      property: 'font-family',
      value:
        'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    },
  ],
  'font-serif': [{ property: 'font-family', value: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }],
  'font-mono': [
    {
      property: 'font-family',
      value: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
  ],
  antialiased: [
    { property: '-webkit-font-smoothing', value: 'antialiased', semanticGroup: 'font-smoothing' },
    { property: '-moz-osx-font-smoothing', value: 'grayscale', semanticGroup: 'font-smoothing' },
  ],
  'subpixel-antialiased': [
    { property: '-webkit-font-smoothing', value: 'auto', semanticGroup: 'font-smoothing' },
    { property: '-moz-osx-font-smoothing', value: 'auto', semanticGroup: 'font-smoothing' },
  ],
  italic: [{ property: 'font-style', value: 'italic' }],
  'not-italic': [{ property: 'font-style', value: 'normal' }],
  uppercase: [{ property: 'text-transform', value: 'uppercase' }],
  lowercase: [{ property: 'text-transform', value: 'lowercase' }],
  capitalize: [{ property: 'text-transform', value: 'capitalize' }],
  'normal-case': [{ property: 'text-transform', value: 'none' }],
  'text-left': [{ property: 'text-align', value: 'left' }],
  'text-center': [{ property: 'text-align', value: 'center' }],
  'text-right': [{ property: 'text-align', value: 'right' }],
  'text-justify': [{ property: 'text-align', value: 'justify' }],
};
