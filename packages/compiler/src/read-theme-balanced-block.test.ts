import { expect, it } from 'vitest';
import { readThemeBalancedBlock } from './read-theme-balanced-block';

it('reads nested and quoted braces while rejecting unterminated blocks', () => {
  expect(readThemeBalancedBlock('{ value: "}"; nested: { ok: 1; } }tail', 0)).toEqual({
    content: ' value: "}"; nested: { ok: 1; } ',
    end: 34,
  });
  expect(() => readThemeBalancedBlock('{ value: 1', 0)).toThrow('Unterminated CSSX @theme block');
});
