import { describe, expect, it } from 'vitest';

import { create } from './create';

describe('create', () => {
  it('fails when an uncompiled call reaches runtime', () => {
    expect(() => create({ root: 'p-5' })).toThrow('must be compiled');
  });
});
