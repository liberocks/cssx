import { expect, it } from 'vitest';

import { compileOutlineOffsetUtility } from './compile-outline-offset-utility';

it('resolves numbered and arbitrary outline offsets with sign handling', () => {
  expect(compileOutlineOffsetUtility('outline-offset-2', true)).toEqual({
    property: 'outline-offset',
    value: '-2px',
  });
  expect(compileOutlineOffsetUtility('outline-offset-[var(--offset)]', true)).toEqual({
    property: 'outline-offset',
    value: 'calc(var(--offset) * -1)',
  });
  expect(compileOutlineOffsetUtility('outline-offset-0', true)).toEqual({ property: 'outline-offset', value: '0' });
  expect(compileOutlineOffsetUtility('outline-offset-invalid', false)).toBeNull();
  expect(compileOutlineOffsetUtility('outline-2', false)).toBeNull();
});
