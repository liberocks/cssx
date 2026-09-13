import { expect, it } from 'vitest';

import { leadingValue } from './leading-value';

it('resolves named and arbitrary leading values', () => {
  expect(leadingValue('tight')).toBe('1.25');
  expect(leadingValue('[2rem]')).toBe('2rem');
});
