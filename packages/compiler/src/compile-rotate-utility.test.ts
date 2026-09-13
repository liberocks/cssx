import { describe, expect, it } from 'vitest';

import { compileRotateUtility } from './compile-rotate-utility';

describe('compileRotateUtility', () => {
  it('compiles standard and three-dimensional rotations', () => {
    expect(compileRotateUtility('rotate-45', false)).toEqual([{ property: 'rotate', value: '45deg' }]);
    expect(compileRotateUtility('rotate-x-15', false)).toEqual([{ property: 'rotate', value: 'x 15deg' }]);
    expect(compileRotateUtility('rotate-y-90', false)).toEqual([{ property: 'rotate', value: 'y 90deg' }]);
    expect(compileRotateUtility('rotate-z-[1turn]', false)).toEqual([{ property: 'rotate', value: 'z 1turn' }]);
  });

  it('negates valid angles and rejects invalid or unrelated candidates', () => {
    expect(compileRotateUtility('rotate-[15deg]', true)).toEqual([{ property: 'rotate', value: '-15deg' }]);
    expect(compileRotateUtility('rotate-x-invalid', false)).toBeNull();
    expect(compileRotateUtility('scale-50', false)).toBeNull();
  });
});
