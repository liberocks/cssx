import { expect, it } from 'vitest';

import { compileScrollSpacingUtility } from './compile-scroll-spacing-utility';
import { parseTheme } from './theme';

it('resolves physical and logical scroll spacing declarations', () => {
  const theme = parseTheme();
  expect(compileScrollSpacingUtility('scroll-mx-2', false, theme)).toEqual([
    { property: 'scroll-margin-left', value: 'calc(0.25rem * 2)' },
    { property: 'scroll-margin-right', value: 'calc(0.25rem * 2)' },
  ]);
  expect(compileScrollSpacingUtility('scroll-pbs-4', false, theme)).toEqual([
    { property: 'scroll-padding-block-start', value: 'calc(0.25rem * 4)' },
  ]);
  expect(compileScrollSpacingUtility('scroll-m-2', true, theme)).toEqual([
    { property: 'scroll-margin', value: 'calc(0.25rem * -2)' },
  ]);
  expect(compileScrollSpacingUtility('scroll-mx-unknown', false, theme)).toBeNull();
  expect(compileScrollSpacingUtility('scrollbar-thumb-red-500', false, theme)).toBeNull();
});
