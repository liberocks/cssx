import { describe, expect, it } from 'vitest';
import { isStyleArray } from './is-style-array';

describe('isStyleArray', () => {
  it('recognizes nested CSSX style input lists', () => {
    expect(isStyleArray(['a', false])).toBe(true);
    expect(isStyleArray('a')).toBe(false);
  });
});
