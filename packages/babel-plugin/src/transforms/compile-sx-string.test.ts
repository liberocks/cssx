import { createClassNameAllocator } from '@cssxio/compiler';
import { expect, it } from 'vitest';

import type { FileState } from '../state/plugin-types';
import { compileSxString } from './compile-sx-string';

const createState = (classNameAllocator = createClassNameAllocator()): FileState =>
  ({
    classNameAllocator,
    classes: new Map(),
    candidateOrigins: new Map(),
    liveCandidates: new Set(),
    composites: new Map(),
    liveComposites: new Set(),
    liveFallbackClasses: new Set(),
    diagnostics: [],
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

it('supports stable source names, blank input, and passes unknown tokens through with diagnostics', () => {
  const state = createState();
  expect(compileSxString('  ', { fileName: '/project/App.tsx', state })).toBe('');
  const stableName = compileSxString(
    'p-4',
    { fileName: '/project/App.tsx', state, stableClassNames: true },
    { line: 2, column: 0 },
  );
  expect(stableName).toMatch(/^d[a-z0-9]+$/);
  expect(state.liveComposites.has(stableName)).toBe(true);
  const passthrough = compileSxString('p-4 not-a-cssx-utility', { fileName: '', state }, { line: 4, column: 7 });
  expect(passthrough).toContain('not-a-cssx-utility');
  expect(state.diagnostics).toEqual([{ utility: 'not-a-cssx-utility', line: 3, column: 8 }]);
  expect(state.classes.has('p-4')).toBe(true);
  const segment = { value: 0 };
  const stableIdentity = compileSxString('p-8', {
    fileName: '/project/App.tsx',
    state,
    stableClassNames: true,
    stableClassNameIdentity: 'button',
    stableClassNameSegment: segment,
  });
  expect(stableIdentity).toMatch(/^d[a-z0-9]+$/);
  expect(segment.value).toBe(1);
});

it('returns unknown-only sx strings without allocating CSS classes', () => {
  const state = createState();
  expect(compileSxString('external-class', { fileName: '', state })).toBe('external-class');
  expect(state.classes.size).toBe(0);
  expect(state.liveComposites.size).toBe(0);
  expect(state.diagnostics).toEqual([{ utility: 'external-class', line: 0, column: 0 }]);
});

it('does not hide unrelated compiler failures or errors that only resemble utility failures', () => {
  const allocatorError = {
    allocate(): never {
      throw new Error('allocator failed');
    },
    reserve() {},
  };
  const allocatorStringError = {
    allocate(): never {
      throw 'allocator failed';
    },
    reserve() {},
  };
  const utilityError = {
    allocate(): never {
      throw new Error('CSSX cannot compile utility "p-4".');
    },
    reserve() {},
  };

  expect(() => compileSxString('p-4', { fileName: '', state: createState(allocatorError) })).toThrow(
    'allocator failed',
  );
  expect(() => compileSxString('p-4', { fileName: '', state: createState(allocatorStringError) })).toThrow(
    'Unable to compile CSSX sx() utilities.',
  );
  expect(() => compileSxString('p-4', { fileName: '', state: createState(utilityError) })).toThrow(
    'CSSX cannot compile utility "p-4".',
  );
});
