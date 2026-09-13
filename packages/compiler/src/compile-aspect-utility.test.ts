import { expect, it } from 'vitest';

import { compileAspectUtility } from './compile-aspect-utility';
import { parseTheme } from './theme';

it('resolves arbitrary aspect ratios and paired size declarations', () => {
  const theme = parseTheme();
  expect(compileAspectUtility('aspect-[4/3]', false, theme)).toEqual({ property: 'aspect-ratio', value: '4/3' });
  expect(compileAspectUtility('size-4', false, theme)).toEqual([
    { property: 'width', value: 'calc(0.25rem * 4)' },
    { property: 'height', value: 'calc(0.25rem * 4)' },
  ]);
  expect(compileAspectUtility('size-4', true, theme)).toEqual([
    { property: 'width', value: 'calc(0.25rem * -4)' },
    { property: 'height', value: 'calc(0.25rem * -4)' },
  ]);
  expect(compileAspectUtility('size-not-a-token', false, theme)).toBeNull();
  expect(compileAspectUtility('aspect-video', false, theme)).toBeNull();
});
