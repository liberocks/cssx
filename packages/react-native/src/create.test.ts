import { expect, it } from 'vitest';

import { create } from './create';

it('creates named native style records with default options', () => {
  expect(create({ root: 'p-2', empty: '' })).toEqual({
    root: { $$cssx: 3, style: { padding: 8 } },
    empty: { $$cssx: 3, style: {} },
  });
});

it('applies custom themes and platform filtering', () => {
  expect(
    create({ root: 'ios:p-2 bg-brand' }, { platform: 'android', theme: '@theme { --color-brand: #123456; }' }).root
      .style,
  ).toEqual({ backgroundColor: '#123456' });
});
