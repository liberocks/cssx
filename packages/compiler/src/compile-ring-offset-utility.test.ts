import { expect, it } from 'vitest';

import { compileRingOffsetUtility } from './compile-ring-offset-utility';
import { parseTheme } from './theme';

const theme = parseTheme();

it('compiles offset widths through the shared shadow sink', () => {
  expect(compileRingOffsetUtility('ring-offset-2', theme)).toHaveLength(3);
  expect(compileRingOffsetUtility('ring-offset-2', theme)?.[0]).toMatchObject({
    property: '--cssx-ring-offset-width',
    value: '2px',
  });
});

it('compiles offset colors and rejects unrelated or invalid values', () => {
  expect(compileRingOffsetUtility('ring-offset-white', theme)?.[0]).toMatchObject({
    property: '--cssx-ring-offset-color',
  });
  expect(compileRingOffsetUtility('ring-offset-invalid', theme)).toBeNull();
  expect(compileRingOffsetUtility('ring-red-500', theme)).toBeNull();
});
