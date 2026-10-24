import { createClassNameAllocator } from '@cssxio/compiler';
import { expect, it } from 'vitest';

import { createPluginFileState } from './create-plugin-file-state';

it('uses a configured shared class allocator', () => {
  const classNameAllocator = createClassNameAllocator();

  expect(createPluginFileState({ classNameAllocator }).classNameAllocator).toBe(classNameAllocator);
});

it('creates independent per-file collections when no allocator is supplied', () => {
  const first = createPluginFileState({});
  const second = createPluginFileState({});

  expect(first.classNameAllocator).not.toBe(second.classNameAllocator);
  expect(first.styles).not.toBe(second.styles);
  expect(first.classes).not.toBe(second.classes);
  expect(first.liveCandidates).not.toBe(second.liveCandidates);
  expect(first.cssRanges).toEqual([]);
});
