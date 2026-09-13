import * as babelTypes from '@babel/types';
import type { CompiledStyle } from '@cssxio/compiler';
import { expect, it } from 'vitest';

import type { FileState } from './plugin-types';
import { resolveStyleArgument } from './resolve-style-argument';

const style: CompiledStyle = { $$css: 2, c: 'composite', _: [['atom', 'base', 'padding']] };

function state(): FileState {
  return {
    styles: new Map([['styles', { root: style }]]),
    styleCandidates: new Map([['styles', { root: ['p-4'] }]]),
    liveCandidates: new Set<string>(),
  } as unknown as FileState;
}

it('resolves nested static style references and marks their candidates reachable', () => {
  const current = state();
  const node = babelTypes.arrayExpression([
    babelTypes.memberExpression(babelTypes.identifier('styles'), babelTypes.identifier('root')),
    babelTypes.nullLiteral(),
    babelTypes.booleanLiteral(false),
  ]);

  expect(resolveStyleArgument(node, babelTypes, current)).toEqual([style]);
  expect(current.liveCandidates).toEqual(new Set(['p-4']));
});

it('distinguishes ignored nullish values from unsupported runtime forms', () => {
  expect(resolveStyleArgument(babelTypes.nullLiteral(), babelTypes, state())).toBeNull();
  expect(resolveStyleArgument(babelTypes.booleanLiteral(false), babelTypes, state())).toBeNull();
  expect(resolveStyleArgument(babelTypes.identifier('dynamic'), babelTypes, state())).toBeUndefined();
  expect(
    resolveStyleArgument(
      babelTypes.memberExpression(babelTypes.identifier('styles'), babelTypes.stringLiteral('root'), true),
      babelTypes,
      state(),
    ),
  ).toBeUndefined();
  expect(resolveStyleArgument(babelTypes.arrayExpression([null]), babelTypes, state())).toBeUndefined();
});

it('returns undefined when a static key does not exist in the local style map', () => {
  expect(
    resolveStyleArgument(
      babelTypes.memberExpression(babelTypes.identifier('styles'), babelTypes.identifier('missing')),
      babelTypes,
      state(),
    ),
  ).toBeUndefined();
});
