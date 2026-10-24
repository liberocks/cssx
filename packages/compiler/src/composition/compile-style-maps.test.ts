import { describe, expect, it } from 'vitest';

import { compileStyleMaps } from './compile-style-maps';

describe('compileStyleMaps', () => {
  it('compiles several style maps into one set of shared CSS', async () => {
    const result = await compileStyleMaps({
      button: { base: 'p-4' },
      card: { base: 'bg-red-500' },
    });

    expect(result.rules).toHaveLength(1);
    expect(result.styleMaps.button?.styles.base).toBeDefined();
    expect(result.styleMaps.card?.styles.base).toBeDefined();
    expect(result.styleMaps.button?.classes['p-4']).toBe(result.styleMaps.card?.classes['p-4']);
  });

  it('returns empty maps and rules for empty input', async () => {
    const result = await compileStyleMaps({});

    expect(result.styleMaps).toEqual({});
    expect(result.rules).toEqual([]);
  });
});
