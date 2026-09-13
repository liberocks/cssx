import { expect, it } from 'vitest';

import { pluginFor } from './plugin-for';

it('creates the requested adapter with default and custom options', () => {
  expect(pluginFor('vite').transform).toBeDefined();
  expect(pluginFor('vite', { preflight: false }).transform).toBeDefined();
});
