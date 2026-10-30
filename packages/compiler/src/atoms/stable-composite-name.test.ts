import { describe, expect, it } from 'vitest';

import { stableCompositeName } from './stable-composite-name';

describe('stableCompositeName', () => {
  it('returns a deterministic CSS-safe name for a source anchor', () => {
    const first = stableCompositeName('/src/card.tsx', { line: 2, column: 4 }, 'sx');

    expect(first).toMatch(/^d[0-9a-z]+x$/);
    expect(stableCompositeName('/src/card.tsx', { line: 2, column: 4 }, 'sx')).toBe(first);
    expect(stableCompositeName('/src/card.tsx', { line: 2, column: 5 }, 'sx')).not.toBe(first);
  });
});
