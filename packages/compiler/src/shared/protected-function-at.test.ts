import { expect, it } from 'vitest';

import { protectedFunctionAt } from './protected-function-at';

it('recognizes protected functions at identifier boundaries', () => {
  expect(protectedFunctionAt('URL(path_name)', 0)).toBe('URL');
  expect(protectedFunctionAt('xurl(path_name)', 1)).toBeNull();
  expect(protectedFunctionAt('other(path_name)', 0)).toBeNull();
});
