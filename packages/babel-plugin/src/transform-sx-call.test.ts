import { transformSync } from '@babel/core';
import type { NodePath } from '@babel/core';
import * as babelTypes from '@babel/types';
import type { CallExpression } from '@babel/types';
import { createClassNameAllocator } from '@cssxio/compiler';
import { expect, it } from 'vitest';

import type { FileState } from './plugin-types';
import { transformSxCall } from './transform-sx-call';

const createContext = () => ({
  fileName: '/project/App.tsx',
  state: {
    classNameAllocator: createClassNameAllocator(),
    classes: new Map(),
    candidateOrigins: new Map(),
    liveCandidates: new Set(),
    composites: new Map(),
    liveComposites: new Set(),
    liveFallbackClasses: new Set(),
  } as unknown as FileState,
});

it('folds static calls and keeps already-generated CSSX names unchanged', () => {
  const context = createContext();
  const transform = (source: string) =>
    transformSync(source, {
      babelrc: false,
      configFile: false,
      plugins: [
        () => ({
          visitor: {
            CallExpression: (path: NodePath<CallExpression>) => transformSxCall(path, babelTypes, context),
          },
        }),
      ],
    });

  expect(transform("sx('p-4')")?.code).toMatch(/"s[0-9A-Za-z]+x"/);
  expect(transform("sx('s0x')")?.code).toBe("sx('s0x');");
  expect(context.state.liveCandidates).toEqual(new Set(['p-4']));
});

it('transforms supported dynamic branches and leaves spreads unchanged', () => {
  const context = createContext();
  const transform = (source: string) =>
    transformSync(source, {
      babelrc: false,
      configFile: false,
      plugins: [
        () => ({
          visitor: {
            CallExpression: (path: NodePath<CallExpression>) => transformSxCall(path, babelTypes, context),
          },
        }),
      ],
    });

  expect(transform("sx(enabled && 'p-4')")?.code).toContain('enabled && "s');
  expect(transform('sx(...values)')?.code).toContain('sx(...values)');
});
