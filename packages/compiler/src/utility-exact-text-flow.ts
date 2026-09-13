import type { UtilityDeclaration } from './utility-types';

/** Fixed text wrapping, truncation, hyphenation, and list declarations. */
export const EXACT_TEXT_FLOW_DECLARATIONS: Readonly<Record<string, readonly UtilityDeclaration[]>> = {
  truncate: [
    { property: 'overflow', value: 'hidden', semanticGroup: 'truncate' },
    { property: 'text-overflow', value: 'ellipsis', semanticGroup: 'truncate' },
    { property: 'white-space', value: 'nowrap', semanticGroup: 'truncate' },
  ],
  'text-ellipsis': [{ property: 'text-overflow', value: 'ellipsis' }],
  'text-clip': [{ property: 'text-overflow', value: 'clip' }],
  'hyphens-none': [
    { property: '-webkit-hyphens', value: 'none', semanticGroup: 'hyphens' },
    { property: 'hyphens', value: 'none', semanticGroup: 'hyphens' },
  ],
  'hyphens-manual': [
    { property: '-webkit-hyphens', value: 'manual', semanticGroup: 'hyphens' },
    { property: 'hyphens', value: 'manual', semanticGroup: 'hyphens' },
  ],
  'hyphens-auto': [
    { property: '-webkit-hyphens', value: 'auto', semanticGroup: 'hyphens' },
    { property: 'hyphens', value: 'auto', semanticGroup: 'hyphens' },
  ],
  'whitespace-normal': [{ property: 'white-space', value: 'normal' }],
  'whitespace-nowrap': [{ property: 'white-space', value: 'nowrap' }],
  'whitespace-pre': [{ property: 'white-space', value: 'pre' }],
  'whitespace-pre-line': [{ property: 'white-space', value: 'pre-line' }],
  'whitespace-pre-wrap': [{ property: 'white-space', value: 'pre-wrap' }],
  'whitespace-break-spaces': [{ property: 'white-space', value: 'break-spaces' }],
  'text-wrap': [{ property: 'text-wrap', value: 'wrap' }],
  'text-nowrap': [{ property: 'text-wrap', value: 'nowrap' }],
  'text-balance': [{ property: 'text-wrap', value: 'balance' }],
  'text-pretty': [{ property: 'text-wrap', value: 'pretty' }],
  'wrap-anywhere': [{ property: 'overflow-wrap', value: 'anywhere' }],
  'wrap-break-word': [{ property: 'overflow-wrap', value: 'break-word' }],
  'wrap-normal': [{ property: 'overflow-wrap', value: 'normal' }],
  'list-inside': [{ property: 'list-style-position', value: 'inside' }],
  'list-outside': [{ property: 'list-style-position', value: 'outside' }],
  'list-none': [{ property: 'list-style-type', value: 'none' }],
  'list-disc': [{ property: 'list-style-type', value: 'disc' }],
  'list-decimal': [{ property: 'list-style-type', value: 'decimal' }],
  'list-image-none': [{ property: 'list-style-image', value: 'none' }],
};
