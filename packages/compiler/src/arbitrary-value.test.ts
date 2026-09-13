import { describe, expect, it } from 'vitest';

import { arbitraryValue } from './arbitrary-value';

describe('arbitraryValue', () => {
  it('decodes bracketed and custom-property shorthand values', () => {
    expect(arbitraryValue('[steps(4,_end)]')).toBe('steps(4, end)');
    expect(arbitraryValue('(--duration)')).toBe('var(--duration)');
  });

  it('rejects values without a complete arbitrary delimiter pair', () => {
    expect(arbitraryValue('steps(4)')).toBeNull();
    expect(arbitraryValue('[unfinished')).toBeNull();
  });
});
