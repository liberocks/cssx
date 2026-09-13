import { describe, expect, it } from 'vitest';

import { readSelectorStringEnd } from './read-selector-string-end';

describe('readSelectorStringEnd', () => {
  it('finds the closing quote after escaped quote characters', () => {
    const selector = '"quoted \\" content" tail';
    expect(selector.slice(0, readSelectorStringEnd(selector, 0, '"') + 1)).toBe('"quoted \\" content"');
  });

  it('rejects a string without a matching closing quote', () => {
    expect(() => readSelectorStringEnd('"open', 0, '"')).toThrow('string');
  });
});
