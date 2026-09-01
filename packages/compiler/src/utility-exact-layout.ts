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
  'justify-between': [{ property: 'justify-content', value: 'space-between' }],
  'justify-around': [{ property: 'justify-content', value: 'space-around' }],
  'justify-evenly': [{ property: 'justify-content', value: 'space-evenly' }],
  'self-auto': [{ property: 'align-self', value: 'auto' }],
  'self-start': [{ property: 'align-self', value: 'flex-start' }],
  'self-center': [{ property: 'align-self', value: 'center' }],
  'self-end': [{ property: 'align-self', value: 'flex-end' }],
  'self-stretch': [{ property: 'align-self', value: 'stretch' }],
  'self-baseline': [{ property: 'align-self', value: 'baseline' }],
  'justify-items-start': [{ property: 'justify-items', value: 'start' }],
  'justify-items-center': [{ property: 'justify-items', value: 'center' }],
  'justify-items-end': [{ property: 'justify-items', value: 'end' }],
  'justify-items-stretch': [{ property: 'justify-items', value: 'stretch' }],
  'justify-self-auto': [{ property: 'justify-self', value: 'auto' }],
  'justify-self-start': [{ property: 'justify-self', value: 'start' }],
  'justify-self-center': [{ property: 'justify-self', value: 'center' }],
  'justify-self-end': [{ property: 'justify-self', value: 'end' }],
  'justify-self-stretch': [{ property: 'justify-self', value: 'stretch' }],
  'place-items-start': [{ property: 'place-items', value: 'start' }],
  'place-items-center': [{ property: 'place-items', value: 'center' }],
  'place-items-end': [{ property: 'place-items', value: 'end' }],
  'place-items-stretch': [{ property: 'place-items', value: 'stretch' }],
  'place-items-baseline': [{ property: 'place-items', value: 'baseline' }],
  'place-self-auto': [{ property: 'place-self', value: 'auto' }],
  'place-self-start': [{ property: 'place-self', value: 'start' }],
  'place-self-center': [{ property: 'place-self', value: 'center' }],
  'place-self-end': [{ property: 'place-self', value: 'end' }],
  'place-self-stretch': [{ property: 'place-self', value: 'stretch' }],
  'place-content-start': [{ property: 'place-content', value: 'start' }],
  'place-content-center': [{ property: 'place-content', value: 'center' }],
  'place-content-end': [{ property: 'place-content', value: 'end' }],
  'place-content-between': [{ property: 'place-content', value: 'space-between' }],
  'place-content-around': [{ property: 'place-content', value: 'space-around' }],
  'place-content-evenly': [{ property: 'place-content', value: 'space-evenly' }],
  'place-content-stretch': [{ property: 'place-content', value: 'stretch' }],
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
