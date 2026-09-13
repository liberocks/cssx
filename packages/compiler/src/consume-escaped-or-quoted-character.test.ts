import { describe, expect, it } from 'vitest';

import { consumeEscapedOrQuotedCharacter } from './consume-escaped-or-quoted-character';

describe('consumeEscapedOrQuotedCharacter', () => {
  it('opens and closes single- and double-quoted strings', () => {
    expect(consumeEscapedOrQuotedCharacter("'", '', false)).toEqual({ quote: "'", escaped: false, protected: true });
    expect(consumeEscapedOrQuotedCharacter('a', '"', false)).toEqual({ quote: '"', escaped: false, protected: true });
    expect(consumeEscapedOrQuotedCharacter('"', '"', false)).toEqual({ quote: '', escaped: false, protected: true });
    expect(consumeEscapedOrQuotedCharacter("'", "'", false)).toEqual({ quote: '', escaped: false, protected: true });
  });

  it('preserves quoted strings across escapes and consumes escaped characters', () => {
    expect(consumeEscapedOrQuotedCharacter('\\', '', false)).toEqual({ quote: '', escaped: true, protected: true });
    expect(consumeEscapedOrQuotedCharacter(' ', '', true)).toEqual({ quote: '', escaped: false, protected: true });
    expect(consumeEscapedOrQuotedCharacter('\\', '"', false)).toEqual({ quote: '"', escaped: true, protected: true });
    expect(consumeEscapedOrQuotedCharacter('"', '"', true)).toEqual({
      quote: '"',
      escaped: false,
      protected: true,
    });
  });

  it('leaves ordinary unquoted characters available to the scanner', () => {
    expect(consumeEscapedOrQuotedCharacter(':', '', false)).toEqual({ quote: '', escaped: false, protected: false });
  });
});
