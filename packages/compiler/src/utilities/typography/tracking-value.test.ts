import { expect, it } from 'vitest';

import { trackingValue } from './tracking-value';

it('resolves named tracking values', () => {
  expect(trackingValue('wide')).toBe('0.025em');
});
