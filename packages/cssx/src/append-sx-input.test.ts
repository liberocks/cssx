import { describe, expect, it } from 'vitest';
import { appendSxInput } from './append-sx-input';

describe('appendSxInput', () => {
  it('flattens nested class input', () => {
    const classes: string[] = [];
    appendSxInput(['a', false, ['b']], classes);
    expect(classes).toEqual(['a', 'b']);
  });
});
