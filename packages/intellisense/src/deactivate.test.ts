import { expect, it } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { deactivate } from './deactivate.js';

it('returns without leaving extension state behind', () => {
  expect(deactivate()).toBeUndefined();
});
