import * as babelTypes from '@babel/types';
import { createClassNameAllocator } from '@cssxio/compiler';
import { expect, it } from 'vitest';
import type { FileState } from './plugin-types';
import { transformSxArgument } from './transform-sx-argument';

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

it('compiles strings, preserves generated names, and converts ignored values to empty strings', () => {
  const context = createContext();
  expect(transformSxArgument(babelTypes.stringLiteral('p-4'), babelTypes, context)).toMatchObject({
    type: 'StringLiteral',
  });
  const generated = babelTypes.stringLiteral('s0x');
  expect(transformSxArgument(generated, babelTypes, context)).toBe(generated);
  expect(transformSxArgument(babelTypes.nullLiteral(), babelTypes, context)).toEqual(babelTypes.stringLiteral(''));
  expect(transformSxArgument(babelTypes.booleanLiteral(false), babelTypes, context)).toEqual(
    babelTypes.stringLiteral(''),
  );
});

it('transforms supported arrays, logical expressions, and conditionals recursively', () => {
  const context = createContext();
  const dynamic = babelTypes.identifier('enabled');
  expect(
    transformSxArgument(babelTypes.arrayExpression([babelTypes.stringLiteral('p-4'), dynamic]), babelTypes, context),
  ).toMatchObject({ type: 'ArrayExpression' });
  expect(
    transformSxArgument(
      babelTypes.logicalExpression('&&', dynamic, babelTypes.stringLiteral('m-2')),
      babelTypes,
      context,
    ),
  ).toMatchObject({ type: 'LogicalExpression' });
  expect(
    transformSxArgument(
      babelTypes.conditionalExpression(dynamic, babelTypes.stringLiteral('p-4'), babelTypes.stringLiteral('m-2')),
      babelTypes,
      context,
    ),
  ).toMatchObject({ type: 'ConditionalExpression' });
});

it('stops folding for spreads, sparse arrays, and unsupported nested branches', () => {
  const context = createContext();
  expect(
    transformSxArgument(babelTypes.spreadElement(babelTypes.identifier('values')), babelTypes, context),
  ).toBeUndefined();
  expect(transformSxArgument(babelTypes.arrayExpression([null]), babelTypes, context)).toBeUndefined();
  expect(
    transformSxArgument(
      babelTypes.conditionalExpression(
        babelTypes.identifier('enabled'),
        babelTypes.stringLiteral('p-4'),
        babelTypes.arrayExpression([babelTypes.spreadElement(babelTypes.identifier('values'))]),
      ),
      babelTypes,
      context,
    ),
  ).toBeUndefined();
});
