import type { UtilityDeclaration } from './utility-types';

/**
 * Builds a self-contained mask-gradient channel and image sink.
 *
 * @param family Mask family name.
 * @param semanticGroup Semantic group written by the utility.
 * @returns Mask channel and image declarations.
 */
export function maskGradientSink(family: string, semanticGroup: string): UtilityDeclaration[] {
  const direction: Readonly<Record<string, string>> = {
    t: 'to top',
    r: 'to right',
    b: 'to bottom',
    l: 'to left',
    x: 'to right',
    y: 'to bottom',
  };
  const from = `var(--cssx-mask-${family}-from-color, black) var(--cssx-mask-${family}-from-position, 0%)`;
  const to = `var(--cssx-mask-${family}-to-color, transparent) var(--cssx-mask-${family}-to-position, 100%)`;
  const image =
    family === 'radial'
      ? `radial-gradient(${from}, ${to})`
      : family === 'conic'
        ? `conic-gradient(from var(--cssx-mask-conic-angle, 0deg), ${from}, ${to})`
        : `linear-gradient(${family === 'linear' ? 'var(--cssx-mask-linear-angle, 0deg)' : direction[family]!}, ${from}, ${to})`;
  return [
    { property: `--cssx-mask-${family}`, value: image, semanticGroup },
    { property: 'mask-image', value: `var(--cssx-mask-${family})`, semanticGroup },
  ];
}
