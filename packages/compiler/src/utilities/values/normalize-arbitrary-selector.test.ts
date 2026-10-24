import { describe, expect, it } from 'vitest';

import { normalizeArbitrarySelector } from './normalize-arbitrary-selector';

describe('normalizeArbitrarySelector', () => {
  it('converts unescaped underscores to spaces and preserves escaped underscores', () => {
    expect(normalizeArbitrarySelector('&:is(.card_item, .card\\_label)')).toBe('&:is(.card item, .card_label)');
  });
});
