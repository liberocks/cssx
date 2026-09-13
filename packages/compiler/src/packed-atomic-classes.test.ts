import { expect, it } from 'vitest';

import type { CompiledUtility } from './conflicts';
import { packedAtomicClasses } from './packed-atomic-classes';

it('keeps winning atomic classes in source order across independent scopes', () => {
  const records: CompiledUtility[] = [
    ['old', 'base', 'layout', 'layout'],
    [null, 'base', 'layout', 'layout'],
    ['new', 'base', 'layout', 'layout'],
    ['hover', 'hover', 'layout', 'layout'],
    ['color', 'base', 'color', 'color'],
  ];

  expect(packedAtomicClasses(records)).toEqual(['new', 'hover', 'color']);
});

it('omits empty classes and returns no classes for empty records', () => {
  const records: CompiledUtility[] = [
    ['visible', 'base', 'layout', 'layout'],
    ['', 'base', 'hidden', 'hidden'],
  ];

  expect(packedAtomicClasses(records)).toEqual(['visible']);
  expect(packedAtomicClasses([])).toEqual([]);
});
