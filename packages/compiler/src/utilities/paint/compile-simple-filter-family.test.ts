import { expect, it } from 'vitest';

import { compileSimpleFilterFamily } from './compile-simple-filter-family';

const sink = 'var(--channel,)';

it('resolves named, default, and arbitrary standard filter channels', () => {
  expect(compileSimpleFilterFamily('brightness-125', 'filter', '--fx-', '', sink, false)?.[0]?.value).toBe(
    'brightness(1.25)',
  );
  expect(compileSimpleFilterFamily('blur', 'filter', '--fx-', '', sink, false)?.[0]?.value).toBe('blur(8px)');
  expect(compileSimpleFilterFamily('blur-[2px]', 'filter', '--fx-', '', sink, false)?.[0]?.value).toBe('blur(2px)');
  expect(compileSimpleFilterFamily('grayscale', 'filter', '--fx-', '', sink, false)?.[0]?.value).toBe('grayscale(1)');
  expect(compileSimpleFilterFamily('opacity-50', 'backdrop-filter', '--fx-', 'backdrop-', sink, true)).not.toBeNull();
});

it('rejects opacity outside backdrop filters and unknown channel values', () => {
  expect(compileSimpleFilterFamily('opacity-50', 'filter', '--fx-', '', sink, false)).toBeNull();
  expect(compileSimpleFilterFamily('blur-unknown', 'filter', '--fx-', '', sink, false)).toBeNull();
  expect(compileSimpleFilterFamily('other-filter', 'filter', '--fx-', '', sink, true)).toBeNull();
});
