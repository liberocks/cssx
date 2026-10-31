import { expect, it } from 'vitest';

import { parseTheme } from '../../theme/theme';
import { compileFluidFontSizeUtility } from './compile-fluid-font-size-utility';

it('interpolates paired sizes and line heights between the default theme breakpoints', () => {
  expect(compileFluidFontSizeUtility('3xl', '4xl', parseTheme())).toEqual([
    { property: 'font-size', value: 'clamp(1.875rem, calc(1.704545rem + 0.568182vw), 2.25rem)' },
    { property: 'line-height', value: 'clamp(2.25rem, calc(2.136364rem + 0.378788vw), 2.5rem)' },
  ]);
});

it('returns null when either endpoint is not a supported rem token', () => {
  expect(compileFluidFontSizeUtility('unknown', '4xl', parseTheme())).toBeNull();
});

it('supports decreasing sizes and absolute or unitless custom line heights', () => {
  expect(compileFluidFontSizeUtility('4xl', '3xl', parseTheme())?.[0]?.value).toContain(
    'calc(2.420455rem - 0.568182vw)',
  );

  const theme = parseTheme(`@theme {
    --text-fluid-start: 1rem;
    --text-fluid-start--line-height: 1.5rem;
    --text-fluid-end: 2rem;
    --text-fluid-end--line-height: 1.2;
  }`);
  expect(compileFluidFontSizeUtility('fluid-start', 'fluid-end', theme)).toHaveLength(2);
});

it('omits fluid line height when a paired line-height token is missing or unsupported', () => {
  const missing = parseTheme(`@theme {
    --text-fluid-start: 1rem;
    --text-fluid-start--line-height: initial;
    --text-fluid-end: 2rem;
    --text-fluid-end--line-height: initial;
  }`);
  expect(compileFluidFontSizeUtility('fluid-start', 'fluid-end', missing)).toHaveLength(1);

  const unsupported = parseTheme(`@theme {
    --text-fluid-start: 1rem;
    --text-fluid-start--line-height: normal;
    --text-fluid-end: 2rem;
    --text-fluid-end--line-height: 1.5rem;
  }`);
  expect(compileFluidFontSizeUtility('fluid-start', 'fluid-end', unsupported)).toHaveLength(1);
});
