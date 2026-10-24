import { describe, expect, it } from 'vitest';

import { compileArbitraryProperty } from './compile-arbitrary-property';

describe('compileArbitraryProperty', () => {
  it('parses standard and custom properties, trimming surrounding whitespace', () => {
    expect(compileArbitraryProperty('[ color : red ]')).toEqual({ property: 'color', value: 'red' });
    expect(compileArbitraryProperty('[--theme-accent:var(--accent)]')).toEqual({
      property: '--theme-accent',
      value: 'var(--accent)',
    });
  });

  it('rejects invalid property names, empty values, and unsafe delimiters', () => {
    for (const utility of ['[123:unsafe]', '[color:]', '[color:red;display:none]', '[color:red}]']) {
      expect(() => compileArbitraryProperty(utility), utility).toThrow('Invalid arbitrary CSSX utility');
    }
  });
});
