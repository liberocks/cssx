import { expect, it } from 'vitest';

import { inspectCalls } from './ast-test-paths';

it('inspects each call in the parsed module in visitor order', () => {
  expect(inspectCalls('first(); second();', (path) => (path.node.callee as { name: string }).name)).toEqual([
    'first',
    'second',
  ]);
});
