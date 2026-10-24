import { expect, it } from 'vitest';

import { compileOutlineStyleUtility } from './compile-outline-style-utility';

it('resolves fixed outline styles into independent declarations', () => {
  expect(compileOutlineStyleUtility('outline')).toEqual([
    { property: 'outline-style', value: 'solid' },
    { property: 'outline-width', value: '1px' },
  ]);
  expect(compileOutlineStyleUtility('outline-hidden')).toHaveLength(2);
  expect(compileOutlineStyleUtility('outline-dashed')).toEqual([{ property: 'outline-style', value: 'dashed' }]);
});

it('resolves supported outline widths and ignores unrelated outline utilities', () => {
  expect(compileOutlineStyleUtility('outline-0')).toEqual([{ property: 'outline-width', value: '0' }]);
  expect(compileOutlineStyleUtility('outline-[3px]')).toEqual([{ property: 'outline-width', value: '3px' }]);
  expect(compileOutlineStyleUtility('outline-offset-2')).toBeNull();
  expect(compileOutlineStyleUtility('outline-red-500')).toBeNull();
  expect(compileOutlineStyleUtility('outline-3')).toBeNull();
});
