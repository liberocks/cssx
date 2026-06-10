import type { UtilityDeclaration } from './utility-types';
import { cloneDeclarations } from './utility-values';
import { resolveArbitraryCssValue } from './utility-resolvers';

/** Combined numeric font-variant value fed by independent utility channels. */
const CSSX_NUMERIC_SINK =
  'var(--cssx-numeric-ordinal,) var(--cssx-numeric-slashed-zero,) var(--cssx-numeric-lining-nums,) var(--cssx-numeric-oldstyle-nums,) var(--cssx-numeric-proportional-nums,) var(--cssx-numeric-tabular-nums,) var(--cssx-numeric-diagonal-fractions,) var(--cssx-numeric-stacked-fractions,)';

/**
 * Compiles composable numeric font-variant utilities.
 *
 * @param utility Utility name without variants.
 * @returns Numeric declarations, or null when unsupported.
 */
export function compileNumericUtility(utility: string): UtilityDeclaration[] | null {
  const values: Readonly<Record<string, string>> = {
    ordinal: 'ordinal',
    'slashed-zero': 'slashed-zero',
    'lining-nums': 'lining-nums',
    'oldstyle-nums': 'oldstyle-nums',
    'proportional-nums': 'proportional-nums',
    'tabular-nums': 'tabular-nums',
    'diagonal-fractions': 'diagonal-fractions',
    'stacked-fractions': 'stacked-fractions',
  };
  const channels = ['numeric-normal', ...Object.keys(values).map((value) => `numeric-${value}`)];
  if (utility === 'normal-nums') {
    return [
      {
        property: 'font-variant-numeric',
        value: 'normal',
        semanticGroup: 'numeric-normal',
        semanticConflicts: channels,
      },
    ];
  }
  const value = values[utility];
  if (!value) {
    return null;
  }
  const semanticGroup = `numeric-${utility}`;
  const semanticConflicts = [semanticGroup, 'numeric-normal'];
  return [
    { property: `--cssx-numeric-${utility}`, value, semanticGroup, semanticConflicts },
    { property: 'font-variant-numeric', value: CSSX_NUMERIC_SINK, semanticGroup, semanticConflicts },
  ];
}

/**
 * Compiles fixed and arbitrary background utilities.
 *
 * @param utility Utility name without variants.
 * @returns Background declarations, or null when unsupported.
 */
export function compileBackgroundUtility(utility: string): UtilityDeclaration | UtilityDeclaration[] | null {
  const exact: Readonly<Record<string, UtilityDeclaration | UtilityDeclaration[]>> = {
    'bg-none': { property: 'background-image', value: 'none' },
    'bg-auto': { property: 'background-size', value: 'auto' },
    'bg-cover': { property: 'background-size', value: 'cover' },
    'bg-contain': { property: 'background-size', value: 'contain' },
    'bg-top-left': { property: 'background-position', value: 'top left' },
    'bg-top': { property: 'background-position', value: 'top' },
    'bg-top-right': { property: 'background-position', value: 'top right' },
    'bg-left': { property: 'background-position', value: 'left' },
    'bg-center': { property: 'background-position', value: 'center' },
    'bg-right': { property: 'background-position', value: 'right' },
    'bg-bottom-left': { property: 'background-position', value: 'bottom left' },
    'bg-bottom': { property: 'background-position', value: 'bottom' },
    'bg-bottom-right': { property: 'background-position', value: 'bottom right' },
    'bg-repeat': { property: 'background-repeat', value: 'repeat' },
    'bg-no-repeat': { property: 'background-repeat', value: 'no-repeat' },
    'bg-repeat-x': { property: 'background-repeat', value: 'repeat-x' },
    'bg-repeat-y': { property: 'background-repeat', value: 'repeat-y' },
    'bg-repeat-round': { property: 'background-repeat', value: 'round' },
    'bg-repeat-space': { property: 'background-repeat', value: 'space' },
    'bg-fixed': { property: 'background-attachment', value: 'fixed' },
    'bg-local': { property: 'background-attachment', value: 'local' },
    'bg-scroll': { property: 'background-attachment', value: 'scroll' },
    'bg-clip-border': { property: 'background-clip', value: 'border-box' },
    'bg-clip-padding': { property: 'background-clip', value: 'padding-box' },
    'bg-clip-content': { property: 'background-clip', value: 'content-box' },
    'bg-clip-text': [
      { property: '-webkit-background-clip', value: 'text', semanticGroup: 'background-clip' },
      { property: 'background-clip', value: 'text', semanticGroup: 'background-clip' },
      { property: 'color', value: 'transparent', semanticGroup: 'background-clip' },
    ],
