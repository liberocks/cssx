import { transformSync } from '@babel/core';
import type { NodePath } from '@babel/core';
import * as babelTypes from '@babel/types';
import type { CallExpression, ObjectExpression } from '@babel/types';
import { expect, it } from 'vitest';

import type { FileState } from './plugin-types';
import { readStyleMap } from './read-style-map';

it('reads supported style values and records their source ranges', () => {
  const state = { cssRanges: [] } as unknown as FileState;
  let result: Record<string, string> | undefined;
  transformSync("const utility = 'p-4'; capture({ root: utility, icon: 'm-2' });", {
    babelrc: false,
    configFile: false,
    plugins: [
      () => ({
        visitor: {
          CallExpression: (path: NodePath<CallExpression>) => {
            if (path.get('callee').isIdentifier({ name: 'capture' })) {
              result = readStyleMap(path.get('arguments.0') as NodePath<ObjectExpression>, babelTypes, state);
            }
          },
        },
      }),
    ],
  });

  expect(result).toEqual({ root: 'p-4', icon: 'm-2' });
  expect(state.cssRanges).toHaveLength(2);
});

it('rejects computed properties and dynamic style values with source diagnostics', () => {
  const compile = (source: string) =>
    transformSync(source, {
      babelrc: false,
      configFile: false,
      plugins: [
        () => ({
          visitor: {
            CallExpression: (path: NodePath<CallExpression>) => {
              if (path.get('callee').isIdentifier({ name: 'capture' })) {
                readStyleMap(path.get('arguments.0') as NodePath<ObjectExpression>, babelTypes, {
                  cssRanges: [],
                } as unknown as FileState);
              }
            },
          },
        }),
      ],
    });

  expect(() => compile("capture({ [key]: 'p-4' });")).toThrow('only supports plain object properties');
  expect(() => compile('capture({ root: utility });')).toThrow('must be a static utility string');
});
