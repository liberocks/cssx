import type { UtilityDeclaration } from './utility-types';

/** Compressed exact declarations that share one CSS property. */
type CompactDescriptorGroup = readonly [property: string, entries: string];

/**
 * Expands compact exact declaration data into normal declaration records.
 *
 * @param groups Compressed property and entry groups.
 * @returns Exact declarations keyed by utility name.
 */
function compactDeclarations(
  groups: readonly CompactDescriptorGroup[],
): Readonly<Record<string, readonly UtilityDeclaration[]>> {
  return Object.fromEntries(
    groups.flatMap(([property, entries]) =>
      entries.split(';').map((entry) => {
        const separator = entry.indexOf('=');
        return [entry.slice(0, separator), [{ property, value: entry.slice(separator + 1) }]];
      }),
    ),
  );
}

/** Exact single-property layout declarations stored in compact source form. */
const SIMPLE_DECLARATIONS = compactDeclarations([
  [
    'display',
    'block=block;inline-block=inline-block;inline=inline;flex=flex;inline-flex=inline-flex;grid=grid;inline-grid=inline-grid;flow-root=flow-root;contents=contents;table=table;inline-table=inline-table;table-caption=table-caption;table-cell=table-cell;table-column=table-column;table-column-group=table-column-group;table-footer-group=table-footer-group;table-header-group=table-header-group;table-row-group=table-row-group;table-row=table-row;list-item=list-item',
  ],
  ['box-sizing', 'box-border=border-box;box-content=content-box'],
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
  visible: [{ property: 'visibility', value: 'visible' }],
  invisible: [{ property: 'visibility', value: 'hidden' }],
  'overflow-auto': [{ property: 'overflow', value: 'auto' }],
  'overflow-hidden': [{ property: 'overflow', value: 'hidden' }],
  'overflow-clip': [{ property: 'overflow', value: 'clip' }],
  'overflow-visible': [{ property: 'overflow', value: 'visible' }],
  'overflow-scroll': [{ property: 'overflow', value: 'scroll' }],
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
  'items-start': [{ property: 'align-items', value: 'flex-start' }],
  'items-center': [{ property: 'align-items', value: 'center' }],
  'items-end': [{ property: 'align-items', value: 'flex-end' }],
  'items-stretch': [{ property: 'align-items', value: 'stretch' }],
  'items-baseline': [{ property: 'align-items', value: 'baseline' }],
  'justify-start': [{ property: 'justify-content', value: 'flex-start' }],
  'justify-center': [{ property: 'justify-content', value: 'center' }],
  'justify-end': [{ property: 'justify-content', value: 'flex-end' }],
