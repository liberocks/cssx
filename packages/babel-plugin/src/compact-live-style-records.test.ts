import { transformSync, type NodePath } from '@babel/core';
import * as babelTypes from '@babel/types';
import { compileStyleRecords } from '@cssxio/compiler';
import { expect, it } from 'vitest';

import { compactLiveStyleRecords } from './compact-live-style-records';
import type { FileState } from './plugin-types';
import { styleMapExpression } from './style-map-expression';

const compileMap = (styles: ReturnType<typeof compileStyleRecords>['styles']) => {
  const state = { styles: new Map([['styles', styles]]) } as unknown as FileState;
  return transformSync('const styles = null; consume(styles);', {
    babelrc: false,
    configFile: false,
    plugins: [
      () => ({
        visitor: {
          Program: {
            enter: (path: NodePath<babelTypes.Program>) => {
              const declarator = path.get('body.0.declarations.0');
              if (declarator.isVariableDeclarator()) {
                declarator.node.init = styleMapExpression(styles, babelTypes);
              }
            },
            exit: (path: NodePath<babelTypes.Program>) => {
              path.scope.crawl();
              compactLiveStyleRecords(path, babelTypes, state);
            },
          },
        },
      }),
    ],
  })?.code;
};

it('extracts repeated packed tuples into shared declarations for live style maps', () => {
  const styles = compileStyleRecords({ first: 'flex p-4', second: 'flex p-4' }).styles;
  const code = compileMap(styles);

  expect(code).toMatch(/const _c\d* = \[/);
  expect(code).toContain('_: [_c');
});

it('leaves unique tuples untouched and skips missing runtime bindings', () => {
  const uniqueStyles = compileStyleRecords({ first: 'p-4' }).styles;
  expect(compileMap(uniqueStyles)).not.toMatch(/const _c\d* = \[/);

  const state = { styles: new Map([['styles', uniqueStyles]]) } as unknown as FileState;
  const code = transformSync('const other = 1;', {
    babelrc: false,
    configFile: false,
    plugins: [
      () => ({
        visitor: {
          Program: {
            exit: (path: NodePath<babelTypes.Program>) => compactLiveStyleRecords(path, babelTypes, state),
          },
        },
      }),
    ],
  })?.code;
  expect(code).toContain('const other = 1');
});
