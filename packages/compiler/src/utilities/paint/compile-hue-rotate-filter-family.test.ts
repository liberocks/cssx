import { expect, it } from 'vitest';

import { compileHueRotateFilterFamily } from './compile-hue-rotate-filter-family';

it('resolves numeric positive, negative, and arbitrary hue rotation values', () => {
  expect(
    compileHueRotateFilterFamily('hue-rotate-45', false, 'filter', '--fx-', '', 'var(--channel,)')?.[0]?.value,
  ).toBe('hue-rotate(45deg)');
  expect(
    compileHueRotateFilterFamily('hue-rotate-45', true, 'filter', '--fx-', '', 'var(--channel,)')?.[0]?.value,
  ).toBe('hue-rotate(-45deg)');
  expect(
    compileHueRotateFilterFamily('hue-rotate-[.5turn]', false, 'filter', '--fx-', '', 'var(--channel,)')?.[0]?.value,
  ).toBe('hue-rotate(.5turn)');
  expect(
    compileHueRotateFilterFamily('hue-rotate-invalid', false, 'filter', '--fx-', '', 'var(--channel,)'),
  ).toBeNull();
  expect(compileHueRotateFilterFamily('brightness-100', false, 'filter', '--fx-', '', 'var(--channel,)')).toBeNull();
});
