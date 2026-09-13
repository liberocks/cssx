import { describe, expect, it } from 'vitest';

import { refineAmbiguousGroup } from './refine-ambiguous-group';

describe('refineAmbiguousGroup', () => {
  it('distinguishes border, outline, and decoration widths, styles, and colors', () => {
    expect(refineAmbiguousGroup('border-', 'border-width', 'border-[3px]')).toBe('border-width');
    expect(refineAmbiguousGroup('border-', 'border-width', 'border-red-500')).toBe('border-color');
    expect(refineAmbiguousGroup('border-', 'border-width', 'border-solid')).toBe('border-width');
    expect(refineAmbiguousGroup('outline-', 'outline-style', 'outline-[2px]')).toBe('outline-width');
    expect(refineAmbiguousGroup('outline-', 'outline-style', 'outline-blue-500')).toBe('outline-color');
    expect(refineAmbiguousGroup('outline-', 'outline-style', 'outline-dashed')).toBe('outline-style');
    expect(refineAmbiguousGroup('decoration-', 'text-decoration-color', 'decoration-wavy')).toBe(
      'text-decoration-style',
    );
    expect(refineAmbiguousGroup('decoration-', 'text-decoration-color', 'decoration-red-500')).toBe(
      'text-decoration-color',
    );
    expect(refineAmbiguousGroup('decoration-', 'text-decoration-color', 'decoration-[length:2px]')).toBe(
      'text-decoration-color',
    );
  });

  it('refines text utility groups while preserving other matched prefix groups', () => {
    expect(refineAmbiguousGroup('text-', 'text-color', 'text-3xl')).toBe('font-size');
    expect(refineAmbiguousGroup('text-', 'text-color', 'text-[length:2rem]')).toBe('font-size');
    expect(refineAmbiguousGroup('text-', 'text-color', 'text-center')).toBe('text-align');
    expect(refineAmbiguousGroup('text-', 'text-color', 'text-ellipsis')).toBe('text-overflow');
    expect(refineAmbiguousGroup('text-', 'text-color', 'text-red-500')).toBe('text-color');
    expect(refineAmbiguousGroup('bg-', 'background-image', 'bg-custom')).toBe('background-image');
  });
});
