import { describe, expect, it } from 'vitest';

import { compileAnimationRange } from './compile-animation-range';

describe('compileAnimationRange', () => {
  it('compiles standard, start/end, and arbitrary animation ranges', () => {
    expect(compileAnimationRange('animation-range-entry')).toMatchObject({
      property: 'animation-range',
      value: 'entry',
    });
    expect(compileAnimationRange('animation-range-start-cover')?.property).toBe('animation-range-start');
    expect(compileAnimationRange('animation-range-end-[25%]')?.value).toBe('25%');
    expect(compileAnimationRange('animation-range-(--range)')?.value).toBe('var(--range)');
  });

  it('rejects malformed or unsupported range values', () => {
    expect(compileAnimationRange('animation-range-unknown')).toBeNull();
    expect(compileAnimationRange('animation-range-start-unknown')).toBeNull();
    expect(compileAnimationRange('other-range-entry')).toBeNull();
  });
});
