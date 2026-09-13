import { describe, expect, it } from 'vitest';

import { compileStyleMap } from './compile-style-map';

describe('compileStyleMap', () => {
  it('compiles one style map into records and CSS rules', async () => {
    const result = await compileStyleMap({ root: 'p-4 bg-red-500' });

    expect(result.rules).toHaveLength(1);
    expect(result.rules[0]!.className).toMatch(/^cssx-/);
    expect(result.rules[0]!.css).toContain('padding');
    expect(result.styles.root).toBeDefined();
    expect(result.classNames.root).toBeDefined();
    expect(result.composites).toBeDefined();
  });

  it('returns no rules for an empty style map', async () => {
    const result = await compileStyleMap({});

    expect(result.rules).toEqual([]);
    expect(result.styles).toEqual({});
    expect(result.classes).toEqual({});
  });
});
