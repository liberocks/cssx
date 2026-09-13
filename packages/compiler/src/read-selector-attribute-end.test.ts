import { describe, expect, it } from 'vitest';

import { readSelectorAttributeEnd } from './read-selector-attribute-end';

describe('readSelectorAttributeEnd', () => {
  it('finds the matching closing bracket through nesting, strings, and escapes', () => {
    const nested = '[data-state[open]] tail';
    expect(nested.slice(0, readSelectorAttributeEnd(nested, 0) + 1)).toBe('[data-state[open]]');

    const quoted = '[data-label="]"] tail';
    expect(quoted.slice(0, readSelectorAttributeEnd(quoted, 0) + 1)).toBe('[data-label="]"]');

    const escaped = '[data-label=\\]value] tail';
    expect(escaped.slice(0, readSelectorAttributeEnd(escaped, 0) + 1)).toBe('[data-label=\\]value]');
  });

  it('rejects an attribute without a matching closing bracket', () => {
    expect(() => readSelectorAttributeEnd('[data-state', 0)).toThrow('attribute');
  });
});
