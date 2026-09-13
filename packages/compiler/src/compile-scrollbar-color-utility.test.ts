import { expect, it } from 'vitest';

import { compileScrollbarColorUtility } from './compile-scrollbar-color-utility';
import { parseTheme } from './theme';

it('resolves scrollbar colors into an isolated channel and shared declaration', () => {
  const theme = parseTheme();
  expect(compileScrollbarColorUtility('scrollbar-thumb-red-500/50', theme)).toEqual([
    {
      property: '--cssx-scrollbar-thumb',
      value: 'color-mix(in srgb, oklch(63.71% 0.237 25.331) 50%, transparent)',
      semanticGroup: 'scrollbar-thumb',
    },
    {
      property: 'scrollbar-color',
      value: 'var(--cssx-scrollbar-thumb, #0000) var(--cssx-scrollbar-track, #0000)',
      semanticGroup: 'scrollbar-thumb',
    },
  ]);
  expect(compileScrollbarColorUtility('scrollbar-track-blue-500', theme)?.[0]?.value).toBe(
    'oklch(62.27% 0.214 259.815)',
  );
  expect(compileScrollbarColorUtility('scrollbar-thumb-red-500/invalid', theme)).toBeNull();
  expect(compileScrollbarColorUtility('scrollbar-thumb-not-a-color', theme)).toBeNull();
  expect(compileScrollbarColorUtility('scrollbar-auto', theme)).toBeNull();
});
