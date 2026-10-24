import { expect, it } from 'vitest';

import { compileCursorUtility } from './compile-cursor-utility';

it('resolves supported cursor and will-change keywords', () => {
  expect(compileCursorUtility('cursor-grab')).toEqual({ property: 'cursor', value: 'grab' });
  expect(compileCursorUtility('cursor-zoom-out')).toEqual({ property: 'cursor', value: 'zoom-out' });
  expect(compileCursorUtility('will-change-transform')).toEqual({ property: 'will-change', value: 'transform' });
  expect(compileCursorUtility('cursor-zoom')).toBeNull();
  expect(compileCursorUtility('will-change-opacity')).toBeNull();
});
