/**
 * CSS properties reset by supported shorthand declarations.
 *
 * These sets supplement explicit semantic data when declarations are atomized.
 * They keep later shorthand utilities from leaving earlier longhand utilities in
 * effect, matching CSS shorthand reset behavior during compiled-style merging.
 */
export const SHORTHAND_WRITE_SETS: Readonly<Record<string, readonly string[]>> = {
  font: [
    'font-family',
    'font-size',
    'font-style',
    'font-variant',
    'font-weight',
    'font-stretch',
    'line-height',
    'font-kerning',
    'font-feature-settings',
    'font-variation-settings',
  ],
  background: [
    'background-attachment',
    'background-color',
    'background-image',
    'background-position',
    'background-repeat',
    'background-size',
    'background-origin',
    'background-clip',
  ],
  border: [
    'border-width',
    'border-style',
    'border-color',
    'border-top',
    'border-right',
    'border-bottom',
    'border-left',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
  ],
  animation: [
    'animation-name',
    'animation-duration',
    'animation-timing-function',
    'animation-delay',
    'animation-iteration-count',
