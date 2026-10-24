import { expect, it } from 'vitest';

import { selectLiveGeneratedClasses } from './select-live-generated-classes';

it('keeps every generated class when no inclusion filter is provided', () => {
  const generatedClasses = ['width', 'height'];

  expect(selectLiveGeneratedClasses(generatedClasses, undefined, {})).toBe(generatedClasses);
});

it('retains classes selected directly or through composite selector aliases', () => {
  expect(
    selectLiveGeneratedClasses(['width', 'height', 'unused'], new Set(['height']), { width: ['composite-size'] }),
  ).toEqual(['width', 'height']);
});

it('drops generated classes that are neither included nor aliased', () => {
  expect(selectLiveGeneratedClasses(['width', 'height'], new Set(['other']), {})).toEqual([]);
});
