import type { NodePath } from '@babel/core';
import { transformSync } from '@babel/core';
import * as types from '@babel/types';
import { createClassNameAllocator } from '@cssxio/compiler';
import { expect, it } from 'vitest';

import type { CssxPluginOptions, FileState } from './plugin-types';
import { transformCreateCall } from './transform-create-call';

function transformCreate(source: string, options: CssxPluginOptions = {}) {
  let state: FileState | undefined;
  const result = transformSync(source, {
    babelrc: false,
    configFile: false,
    filename: '/project/styles.ts',
    plugins: [
      () => ({
        visitor: {
          Program: {
            enter() {
              state = {
                classNameAllocator: createClassNameAllocator(),
                styles: new Map(),
                styleCandidates: new Map(),
                styleClasses: new Map(),
                classes: new Map(),
                candidateOrigins: new Map(),
                liveCandidates: new Set(),
                composites: new Map(),
                liveComposites: new Set(),
                liveFallbackClasses: new Set(),
                cssRanges: [],
              };
            },
          },
          CallExpression(path: NodePath<types.CallExpression>) {
            const callee = path.node.callee;
            if (
              !types.isMemberExpression(callee) ||
              !types.isIdentifier(callee.object, { name: 'cssx' }) ||
              !types.isIdentifier(callee.property, { name: 'create' })
            ) {
              return;
            }
            transformCreateCall({ path, types, state: state!, options, fileName: '/project/styles.ts' });
          },
        },
      }),
    ],
  });

  return { result, state: state! };
}

it('compiles a create call and records variable-backed style data', () => {
  const { result, state } = transformCreate(`const styles = cssx.create({ root: 'p-5' });`);

  expect(result?.code).toContain('const styles = {};');
  expect(state.styleCandidates.get('styles')).toEqual({ root: ['p-5'] });
  expect(state.classes.has('p-5')).toBe(true);
  expect(state.cssRanges).toHaveLength(1);
});

it('replaces inline create calls with runtime style records', () => {
  const { result } = transformCreate(`cssx.create({ root: 'p-4' });`);

  expect(result?.code).toContain('$$css: 2');
});

it('reports invalid create arguments and utility recipes at the call site', () => {
  expect(() => transformCreate(`cssx.create(utilities);`)).toThrow('expects one object literal argument');
  expect(() => transformCreate(`cssx.create({ root: 'invalid-utility' });`)).toThrow('cannot classify utility');
});
