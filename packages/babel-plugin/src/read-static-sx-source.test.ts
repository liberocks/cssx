import * as babelTypes from '@babel/types';
import { expect, it } from 'vitest';
import { readStaticSxSource } from './read-static-sx-source';

it('joins static strings and nested arrays while ignoring null and false', () => {
  const nodes = [
    babelTypes.stringLiteral('p-4'),
    babelTypes.booleanLiteral(false),
    babelTypes.nullLiteral(),
    babelTypes.arrayExpression([babelTypes.stringLiteral('m-2'), babelTypes.stringLiteral('text-bold')]),
  ];
  expect(readStaticSxSource(nodes, babelTypes)).toBe('p-4 m-2 text-bold');
});

it('rejects dynamic nodes and sparse arrays and filters empty strings', () => {
  expect(readStaticSxSource([babelTypes.identifier('dynamic')], babelTypes)).toBeNull();
  expect(
    readStaticSxSource([babelTypes.arrayExpression([babelTypes.stringLiteral('p-4'), null])], babelTypes),
  ).toBeNull();
  expect(readStaticSxSource([babelTypes.stringLiteral(''), babelTypes.stringLiteral('p-4')], babelTypes)).toBe('p-4');
});
