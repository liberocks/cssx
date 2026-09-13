import { expect, it } from 'vitest';

import { resolveLineHeight } from './resolve-line-height';
import { parseTheme } from './theme';

it('resolves token, numeric, and arbitrary line-height modifiers', () => {
  const theme = parseTheme('@theme { --leading-tight: 1.25; }');
  expect(resolveLineHeight('tight', theme)).toBe('1.25');
  expect(resolveLineHeight('4', theme)).toBe('calc(0.25rem * 4)');
  expect(resolveLineHeight('[2rem]', theme)).toBe('2rem');
});
