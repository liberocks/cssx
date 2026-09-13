import { describe, expect, it } from 'vitest';

import { compileBorderWidthUtility } from './compile-border-width-utility';

describe('compileBorderWidthUtility', () => {
  it('compiles directional widths, zero, and arbitrary lengths', () => {
    expect(compileBorderWidthUtility('border-x-2')).toEqual([
      { property: 'border-left-width', value: '2px' },
      { property: 'border-right-width', value: '2px' },
    ]);
    expect(compileBorderWidthUtility('border-s-0')).toEqual([{ property: 'border-inline-start-width', value: '0' }]);
    expect(compileBorderWidthUtility('border-[length:3px]')).toEqual({ property: 'border-width', value: '3px' });
  });

  it('rejects unsupported directions and non-length arbitrary values', () => {
    expect(compileBorderWidthUtility('border-z-2')).toBeNull();
    expect(compileBorderWidthUtility('border-[color:red]')).toBeNull();
    expect(compileBorderWidthUtility('border-x-auto')).toBeNull();
  });
});
