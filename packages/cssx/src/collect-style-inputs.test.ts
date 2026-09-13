import { describe, expect, it } from 'vitest';
import { collectStyleInputs } from './collect-style-inputs';
import type { CompiledStyle, CompiledUtility } from './types';

describe('collectStyleInputs', () => {
  it('collects compiled records and raw classes in source order', () => {
    const parts: Array<string | CompiledStyle> = [];
    const records: CompiledUtility[] = [];
    expect(collectStyleInputs(['raw', { $$css: 2, c: 'a', _: [['a', 's', 'g']] }], parts, records)).toBe(1);
    expect(parts).toHaveLength(2);
    expect(records).toEqual([['a', 's', 'g']]);
  });
});
