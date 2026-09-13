import { expect, it } from 'vitest';

import { compileDropShadowFilterFamily } from './compile-drop-shadow-filter-family';

it('resolves default, named, none, and arbitrary drop-shadow channels', () => {
  expect(compileDropShadowFilterFamily('drop-shadow', 'filter', '--fx-', '', 'var(--channel,)')?.[0]?.value).toBe(
    'drop-shadow(0 1px 2px rgb(0 0 0 / .1))',
  );
  expect(compileDropShadowFilterFamily('drop-shadow-sm', 'filter', '--fx-', '', 'var(--channel,)')?.[0]?.value).toBe(
    'drop-shadow(0 1px 2px rgb(0 0 0 / .15))',
  );
  expect(compileDropShadowFilterFamily('drop-shadow-none', 'filter', '--fx-', '', 'var(--channel,)')?.[0]?.value).toBe(
    'drop-shadow(0 0 #0000)',
  );
  expect(
    compileDropShadowFilterFamily('drop-shadow-[0_1px_2px_black]', 'filter', '--fx-', '', 'var(--channel,)')?.[0]
      ?.value,
  ).toBe('drop-shadow(0_1px_2px_black)');
});

it('rejects unsupported drop-shadow properties and names', () => {
  expect(compileDropShadowFilterFamily('drop-shadow-sm', 'backdrop-filter', '--fx-', '', 'var(--channel,)')).toBeNull();
  expect(compileDropShadowFilterFamily('drop-shadow-unknown', 'filter', '--fx-', '', 'var(--channel,)')).toBeNull();
  expect(compileDropShadowFilterFamily('blur-sm', 'filter', '--fx-', '', 'var(--channel,)')).toBeNull();
});
