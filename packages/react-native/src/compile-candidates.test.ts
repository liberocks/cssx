import { parseTheme } from '@cssxio/compiler';
import { expect, it } from 'vitest';

import { compileCandidates } from './compile-candidates';

it('compiles candidate recipes for the active platform and omits inactive candidates', () => {
  expect(compileCandidates(['p-2', 'ios:m-1', 'android:p-4'], parseTheme(), 'ios')).toEqual({
    padding: 8,
    margin: 4,
  });
  expect(compileCandidates([], parseTheme(), undefined)).toEqual({});
});

it('rejects browser-only candidates while appending their resolved declarations', () => {
  expect(() => compileCandidates(['hover:bg-red-500'], parseTheme(), undefined)).toThrow(
    'cannot represent the variant',
  );
});
