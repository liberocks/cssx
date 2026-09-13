import { describe, expect, it } from 'vitest';

import { classifyArbitraryProperty } from './classify-arbitrary-property';

describe('classifyArbitraryProperty', () => {
  it('normalizes standard and custom property names', () => {
    expect(classifyArbitraryProperty('[ PAINT-ORDER : markers ]')).toBe('arbitrary..paint-order');
    expect(classifyArbitraryProperty('[--my-property:value]')).toBe('arbitrary..--my-property');
  });

  it('rejects missing and invalid property names', () => {
    expect(classifyArbitraryProperty('[]')).toBeNull();
    expect(classifyArbitraryProperty('[123:value]')).toBeNull();
    expect(classifyArbitraryProperty('[a.b:value]')).toBeNull();
  });
});
