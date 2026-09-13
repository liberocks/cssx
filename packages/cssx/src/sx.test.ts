import { describe, expect, it } from 'vitest';
import { sx } from './sx';

describe('sx', () => {
  it('joins static, conditional, and nested class strings', () => {
    expect(sx('x-base', false, ['x-nested', [null, 'x-last']])).toBe('x-base x-nested x-last');
  });
});
