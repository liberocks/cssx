import { describe, expect, it } from 'vitest';

import { compileFilterFamily } from './compile-filter-family';

describe('compileFilterFamily', () => {
  const sink = 'var(--channel,)';

  it('compiles simple, hue, and drop-shadow channels', () => {
    expect(compileFilterFamily('brightness-125', false, 'filter', '--fx-', '', sink, false)?.[0]).toMatchObject({
      property: '--fx-brightness',
      value: 'brightness(1.25)',
    });
    expect(compileFilterFamily('blur-[2px]', false, 'filter', '--fx-', '', sink, false)?.[0]?.value).toBe('blur(2px)');
    expect(compileFilterFamily('hue-rotate-[.5turn]', true, 'filter', '--fx-', '', sink, false)?.[0]?.value).toBe(
      'hue-rotate(.5turn)',
    );
    expect(
      compileFilterFamily('drop-shadow-[0_1px_2px_black]', false, 'filter', '--fx-', '', sink, false)?.[0]?.value,
    ).toBe('drop-shadow(0_1px_2px_black)');
  });

  it('applies family restrictions and rejects unknown values', () => {
    expect(compileFilterFamily('opacity-50', false, 'filter', '--fx-', '', sink, false)).toBeNull();
    expect(
      compileFilterFamily('opacity-50', false, 'backdrop-filter', '--fx-', 'backdrop-', sink, true),
    ).not.toBeNull();
    expect(compileFilterFamily('drop-shadow', false, 'backdrop-filter', '--fx-', 'backdrop-', sink, true)).toBeNull();
    expect(compileFilterFamily('hue-rotate-invalid', false, 'filter', '--fx-', '', sink, false)).toBeNull();
    expect(compileFilterFamily('other-filter', false, 'filter', '--fx-', '', sink, false)).toBeNull();
  });

  it('creates a reset for the active semantic family', () => {
    expect(compileFilterFamily('filter-none', false, 'filter', '--fx-', '', sink, false)?.[0]).toMatchObject({
      property: 'filter',
      semanticConflicts: expect.arrayContaining(['blur', 'filter-none']),
    });
  });
});
