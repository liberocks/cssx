import type { UtilityDeclaration } from './utility-types';

/** Fixed pointer, selection, decoration, appearance, and resize declarations. */
export const EXACT_INTERACTION_DECLARATIONS: Readonly<Record<string, readonly UtilityDeclaration[]>> = {
  underline: [{ property: 'text-decoration-line', value: 'underline' }],
  overline: [{ property: 'text-decoration-line', value: 'overline' }],
  'line-through': [{ property: 'text-decoration-line', value: 'line-through' }],
  'no-underline': [{ property: 'text-decoration-line', value: 'none' }],
  'pointer-events-none': [{ property: 'pointer-events', value: 'none' }],
  'pointer-events-auto': [{ property: 'pointer-events', value: 'auto' }],
  'select-none': [{ property: 'user-select', value: 'none' }],
  'select-text': [{ property: 'user-select', value: 'text' }],
  'select-all': [{ property: 'user-select', value: 'all' }],
  'select-auto': [{ property: 'user-select', value: 'auto' }],
  'appearance-none': [{ property: 'appearance', value: 'none' }],
  'appearance-auto': [{ property: 'appearance', value: 'auto' }],
  'field-sizing-content': [{ property: 'field-sizing', value: 'content' }],
  'resize-none': [{ property: 'resize', value: 'none' }],
  'resize-x': [{ property: 'resize', value: 'horizontal' }],
  'resize-y': [{ property: 'resize', value: 'vertical' }],
  resize: [{ property: 'resize', value: 'both' }],
};
