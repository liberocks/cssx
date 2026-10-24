import { describe, expect, it } from 'vitest';

import { parseSelector } from './parse-selector';

describe('parseSelector', () => {
  it('keeps nesting, attributes, strings, comments, and text as separate nodes', () => {
    expect(parseSelector('&[data-state="[open]"]/* & */ > ".quoted"')).toEqual({
      hasNesting: true,
      nodes: [
        { type: 'nesting' },
        { type: 'attribute', value: '[data-state="[open]"]' },
        { type: 'comment', value: '/* & */' },
        { type: 'text', value: ' > ' },
        { type: 'string', value: '".quoted"' },
      ],
    });
  });

  it('preserves escaped characters and a trailing escape without creating nesting', () => {
    expect(parseSelector('\\&\\')).toEqual({
      hasNesting: false,
      nodes: [{ type: 'text', value: '\\&\\' }],
    });
  });

  it('rejects unterminated attributes, strings, and comments', () => {
    expect(() => parseSelector('&[data-state')).toThrow('attribute');
    expect(() => parseSelector('&"open')).toThrow('string');
    expect(() => parseSelector('&/* open')).toThrow('comment');
  });
});
