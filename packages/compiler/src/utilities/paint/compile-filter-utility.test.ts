import { describe, expect, it } from 'vitest';

import { compileFilterUtility } from './compile-filter-utility';

describe('compileFilterUtility', () => {
  it('compiles regular filter channels and reset utilities', () => {
    expect(compileFilterUtility('blur-sm', false)?.[0]).toMatchObject({
      property: '--cssx-filter-blur',
      value: 'blur(8px)',
    });
    expect(compileFilterUtility('hue-rotate-45', true)?.[0]?.value).toBe('hue-rotate(-45deg)');
    expect(compileFilterUtility('drop-shadow', false)).toHaveLength(2);
    expect(compileFilterUtility('filter-none', false)?.[0]).toMatchObject({ property: 'filter', value: 'none' });
  });

  it('rejects backdrop-only opacity, invalid channels, and unknown utilities', () => {
    expect(compileFilterUtility('opacity-50', false)).toBeNull();
    expect(compileFilterUtility('hue-rotate-invalid', false)).toBeNull();
    expect(compileFilterUtility('not-a-filter', false)).toBeNull();
  });
});
