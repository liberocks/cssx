import { transformSync, type NodePath } from '@babel/core';
import * as types from '@babel/types';
import type { CallExpression, ObjectExpression } from '@babel/types';
import { expect, it } from 'vitest';

import { readStyleMap } from './read-style-map';

it('reads identifier, string, and numeric keys from literal style values', () => {
  let styles: Readonly<Record<string, string>> = {};
  transformSync(`create({ root: 'p-4', 'root-item': 'bg-red-500', 2: 'm-1' });`, {
    babelrc: false,
    configFile: false,
    plugins: [
      () => ({
        visitor: {
          CallExpression(path: NodePath<CallExpression>) {
            styles = readStyleMap(path.node.arguments[0] as ObjectExpression, types, path);
          },
        },
      }),
    ],
  });

  expect(styles).toEqual({ root: 'p-4', 'root-item': 'bg-red-500', '2': 'm-1' });
});

it('rejects spreads, dynamic values, computed keys, and unsupported key nodes', () => {
  const assertRejected = (argument: string, message: string) => {
    expect(() =>
      transformSync(`create(${argument});`, {
        babelrc: false,
        configFile: false,
        plugins: [
          () => ({
            visitor: {
              CallExpression(path: NodePath<CallExpression>) {
                readStyleMap(path.node.arguments[0] as ObjectExpression, types, path);
              },
            },
          }),
        ],
      }),
    ).toThrow(message);
  };

  assertRejected('{ ...styles }', 'static string literals');
  assertRejected('{ root: value }', 'static string literals');
  assertRejected("{ [key]: 'p-4' }", 'style keys must be static');
  assertRejected("{ 1n: 'p-4' }", 'style keys must be static');
});
