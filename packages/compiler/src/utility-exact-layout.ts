import { compactDeclarations } from './compact-declarations';
import { EXACT_ALIGNMENT_DECLARATIONS } from './utility-exact-alignment';
import { EXACT_FLEX_DECLARATIONS } from './utility-exact-flex';
import { EXACT_TYPOGRAPHY_DECLARATIONS } from './utility-exact-typography';
import type { UtilityDeclaration } from './utility-types';

/** Exact single-property layout declarations stored in compact source form. */
const SIMPLE_DECLARATIONS = compactDeclarations([
  [
    'display',
    'block=block;inline-block=inline-block;inline=inline;flex=flex;inline-flex=inline-flex;grid=grid;inline-grid=inline-grid;flow-root=flow-root;contents=contents;table=table;inline-table=inline-table;table-caption=table-caption;table-cell=table-cell;table-column=table-column;table-column-group=table-column-group;table-footer-group=table-footer-group;table-header-group=table-header-group;table-row-group=table-row-group;table-row=table-row;list-item=list-item',
  ],
  ['visibility', 'visible=visible;invisible=hidden;collapse=collapse'],
  ['box-sizing', 'box-border=border-box;box-content=content-box'],
  [
    'border-style',
    'border-none=none;border-hidden=hidden;border-dotted=dotted;border-dashed=dashed;border-solid=solid;border-double=double',
  ],
  ['float', 'float-start=inline-start;float-end=inline-end;float-right=right;float-left=left;float-none=none'],
  [
    'clear',
    'clear-start=inline-start;clear-end=inline-end;clear-right=right;clear-left=left;clear-both=both;clear-none=none',
  ],
]);

/** Exact layout utility declarations that need no runtime value resolution. */
export const EXACT_LAYOUT_DECLARATIONS: Readonly<Record<string, readonly UtilityDeclaration[]>> = {
  ...SIMPLE_DECLARATIONS,
  'box-decoration-slice': [
    { property: '-webkit-box-decoration-break', value: 'slice', semanticGroup: 'box-decoration-break' },
    { property: 'box-decoration-break', value: 'slice', semanticGroup: 'box-decoration-break' },
  ],
  'box-decoration-clone': [
    { property: '-webkit-box-decoration-break', value: 'clone', semanticGroup: 'box-decoration-break' },
    { property: 'box-decoration-break', value: 'clone', semanticGroup: 'box-decoration-break' },
  ],
  'object-top-left': [{ property: 'object-position', value: 'top left' }],
  'object-top': [{ property: 'object-position', value: 'top' }],
  'object-top-right': [{ property: 'object-position', value: 'top right' }],
  'object-left': [{ property: 'object-position', value: 'left' }],
  'object-center': [{ property: 'object-position', value: 'center' }],
  'object-right': [{ property: 'object-position', value: 'right' }],
  'object-bottom-left': [{ property: 'object-position', value: 'bottom left' }],
  'object-bottom': [{ property: 'object-position', value: 'bottom' }],
  'object-bottom-right': [{ property: 'object-position', value: 'bottom right' }],
  'sr-only': [
    { property: 'position', value: 'absolute' },
    { property: 'width', value: '1px' },
    { property: 'height', value: '1px' },
    { property: 'padding', value: '0' },
    { property: 'margin', value: '-1px' },
    { property: 'overflow', value: 'hidden' },
    { property: 'clip-path', value: 'inset(50%)' },
    { property: 'white-space', value: 'nowrap' },
    { property: 'border-width', value: '0' },
  ],
  'not-sr-only': [
    { property: 'position', value: 'static' },
    { property: 'width', value: 'auto' },
    { property: 'height', value: 'auto' },
    { property: 'padding', value: '0' },
    { property: 'margin', value: '0' },
    { property: 'overflow', value: 'visible' },
    { property: 'clip-path', value: 'none' },
    { property: 'white-space', value: 'normal' },
  ],
  hidden: [{ property: 'display', value: 'none' }],
  static: [{ property: 'position', value: 'static' }],
  fixed: [{ property: 'position', value: 'fixed' }],
  absolute: [{ property: 'position', value: 'absolute' }],
  relative: [{ property: 'position', value: 'relative' }],
  sticky: [{ property: 'position', value: 'sticky' }],
  transform: [{ property: 'transform', value: 'translate(0, 0)' }],
  'transform-none': [{ property: 'transform', value: 'none' }],
  'overflow-auto': [{ property: 'overflow', value: 'auto' }],
  'overflow-hidden': [{ property: 'overflow', value: 'hidden' }],
  'overflow-clip': [{ property: 'overflow', value: 'clip' }],
  'overflow-visible': [{ property: 'overflow', value: 'visible' }],
  'overflow-scroll': [{ property: 'overflow', value: 'scroll' }],
  ...EXACT_FLEX_DECLARATIONS,
  ...EXACT_ALIGNMENT_DECLARATIONS,
  ...EXACT_TYPOGRAPHY_DECLARATIONS,
};
