import { expect, it } from 'vitest';

import { compileRingWidthUtility } from './compile-ring-width-utility';

it('uses the default ring width and the shared shadow sink', () => {
  expect(compileRingWidthUtility('ring')).toHaveLength(3);
  expect(compileRingWidthUtility('ring')?.[0]).toMatchObject({ property: '--cssx-ring-width', value: '1px' });
  expect(compileRingWidthUtility('ring')?.[2]?.property).toBe('box-shadow');
});

it('resolves explicit ring widths and leaves other families to their recipe', () => {
  expect(compileRingWidthUtility('ring-4')?.[0]).toMatchObject({ property: '--cssx-ring-width', value: '4px' });
  expect(compileRingWidthUtility('ring-red-500')).toBeNull();
  expect(compileRingWidthUtility('ring-offset-2')).toBeNull();
});
