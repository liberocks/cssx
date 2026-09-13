import { expect, it } from 'vitest';

import { compileRingColorUtility } from './compile-ring-color-utility';
import { parseTheme } from './theme';

const theme = parseTheme();

it('compiles ring colors with optional opacity modifiers', () => {
  expect(compileRingColorUtility('ring-red-500/50', theme)?.[0]?.value).toContain('color-mix');
  expect(compileRingColorUtility('ring-red-500', theme)?.[0]).toMatchObject({
    property: '--cssx-ring-color',
    semanticGroup: 'ring-color',
  });
});

it('rejects invalid colors, opacity modifiers, and unrelated utilities', () => {
  expect(compileRingColorUtility('ring-red-500/101', theme)).toBeNull();
  expect(compileRingColorUtility('ring-not-a-color', theme)).toBeNull();
  expect(compileRingColorUtility('ring-offset-white', theme)).toBeNull();
});
