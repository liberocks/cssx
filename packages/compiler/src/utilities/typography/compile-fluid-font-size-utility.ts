import { resolveThemeValue } from '../../theme/theme';
import type { CssxTheme } from '../../theme/theme';
import type { UtilityDeclaration } from '../registry/utility-types';

/** Theme token represented as a rem-valued length. */
interface RemLength {
  readonly value: number;
  readonly unit: 'rem';
}

/** Compiles a fluid text-size pair between the theme's smallest and largest breakpoints. */
export function compileFluidFontSizeUtility(
  startName: string,
  endName: string,
  theme: CssxTheme,
): UtilityDeclaration[] | null {
  const resolveRemLength = (value: string | undefined): RemLength | null => {
    const match = value && /^(-?\d+(?:\.\d+)?)rem$/.exec(value.trim());
    return match ? { value: Number(match[1]), unit: 'rem' } : null;
  };
  const formatNumber = (value: number): string => Number(value.toFixed(6)).toString();
  const formatRem = (value: number): string => `${formatNumber(value)}rem`;
  const fluidClamp = (start: RemLength, end: RemLength, min: RemLength, max: RemLength): string => {
    const slope = ((end.value - start.value) / (max.value - min.value)) * 100;
    const intercept = start.value - (slope * min.value) / 100;
    const sign = slope < 0 ? '-' : '+';
    return `clamp(${formatRem(start.value)}, calc(${formatRem(intercept)} ${sign} ${formatNumber(Math.abs(slope))}vw), ${formatRem(end.value)})`;
  };
  const resolveTextLineHeight = (name: string, fontSize: RemLength): RemLength | null => {
    const value = resolveThemeValue(theme, `--text-${name}--line-height`);
    if (!value) {
      return null;
    }
    const length = resolveRemLength(value);
    if (length) {
      return length;
    }
    const ratio = /^(?:calc\()?\s*([\d.]+)\s*\/\s*([\d.]+)\s*\)?$/.exec(value);
    if (ratio) {
      return { value: fontSize.value * (Number(ratio[1]) / Number(ratio[2])), unit: 'rem' };
    }
    const number = /^([\d.]+)$/.exec(value);
    return number ? { value: fontSize.value * Number(number[1]), unit: 'rem' } : null;
  };

  const startSize = resolveRemLength(resolveThemeValue(theme, `--text-${startName}`));
  const endSize = resolveRemLength(resolveThemeValue(theme, `--text-${endName}`));
  const breakpoints = Object.entries(theme.tokens)
    .filter(([name]) => name.startsWith('--breakpoint-'))
    .map(([, value]) => resolveRemLength(value))
    .filter((value): value is RemLength => value !== null)
    .sort((left, right) => left.value - right.value);
  const minBreakpoint = breakpoints[0];
  const maxBreakpoint = breakpoints.at(-1);
  if (!startSize || !endSize || !minBreakpoint || !maxBreakpoint || minBreakpoint.value >= maxBreakpoint.value) {
    return null;
  }

  const declarations: UtilityDeclaration[] = [
    { property: 'font-size', value: fluidClamp(startSize, endSize, minBreakpoint, maxBreakpoint) },
  ];
  const startLineHeight = resolveTextLineHeight(startName, startSize);
  const endLineHeight = resolveTextLineHeight(endName, endSize);
  if (startLineHeight && endLineHeight) {
    declarations.push({
      property: 'line-height',
      value: fluidClamp(startLineHeight, endLineHeight, minBreakpoint, maxBreakpoint),
    });
  }
  return declarations;
}
