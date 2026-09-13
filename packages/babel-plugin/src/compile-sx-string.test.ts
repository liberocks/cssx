import { createClassNameAllocator } from '@cssxio/compiler';
import { expect, it } from 'vitest';
import type { FileState } from './plugin-types';
import { compileSxString } from './compile-sx-string';

const createState = (): FileState =>
  ({
    classNameAllocator: createClassNameAllocator(),
    classes: new Map(),
    candidateOrigins: new Map(),
    liveCandidates: new Set(),
    composites: new Map(),
    liveComposites: new Set(),
    liveFallbackClasses: new Set(),
  }) as unknown as FileState;

it('compiles utility strings and records class, candidate, origin, and composite metadata', () => {
  const state = createState();
  const className = compileSxString('p-4', { fileName: '/project/App.tsx', state }, { line: 3, column: 4 });

  expect(className).toMatch(/^s[0-9A-Za-z]+x$/);
  expect(state.classes.has('p-4')).toBe(true);
  expect(state.candidateOrigins.get('p-4')).toEqual({ line: 2, column: 4 });
  expect(state.liveCandidates).toEqual(new Set(['p-4']));
  expect(state.liveComposites).toEqual(new Set([className]));
});

it('supports stable source names, blank input, and compiler errors', () => {
  const state = createState();
  expect(compileSxString('  ', { fileName: '/project/App.tsx', state })).toBe('');
  const stableName = compileSxString(
    'p-4',
    { fileName: '/project/App.tsx', state, stableClassNames: true },
    { line: 2, column: 0 },
  );
  expect(stableName).toMatch(/^d[a-z0-9]+$/);
  expect(state.liveComposites.has(stableName)).toBe(true);
  expect(() => compileSxString('not-a-cssx-utility', { fileName: '', state })).toThrow();
});
