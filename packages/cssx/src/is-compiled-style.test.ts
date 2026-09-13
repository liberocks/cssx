import { describe, expect, it } from 'vitest';

import { isCompiledStyle } from './is-compiled-style';

describe('isCompiledStyle', () => {
  it('requires every CSSX compiled-style marker', () => {
    expect(isCompiledStyle({ $$css: 2, c: 'a', _: [] })).toBe(true);
    expect(isCompiledStyle({ $$css: 2, c: 'a' } as never)).toBe(false);
  });
});
