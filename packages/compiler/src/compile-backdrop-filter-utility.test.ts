import { describe, expect, it } from 'vitest';

import { compileBackdropFilterUtility } from './compile-backdrop-filter-utility';

describe('compileBackdropFilterUtility', () => {
  it('compiles backdrop channels with WebKit and standard declarations', () => {
    const declarations = compileBackdropFilterUtility('backdrop-opacity-50', false);
    expect(declarations).toHaveLength(3);
    expect(declarations?.[0]).toMatchObject({ property: '--cssx-backdrop-opacity', value: 'opacity(.5)' });
    expect(declarations?.[1]?.property).toBe('-webkit-backdrop-filter');
    expect(declarations?.[2]?.property).toBe('backdrop-filter');
  });

  it('supports backdrop resets and rejects unrelated or unsupported channels', () => {
    expect(compileBackdropFilterUtility('backdrop-filter-none', false)).toHaveLength(2);
    expect(compileBackdropFilterUtility('blur-sm', false)).toBeNull();
    expect(compileBackdropFilterUtility('backdrop-drop-shadow', false)).toBeNull();
  });
});
