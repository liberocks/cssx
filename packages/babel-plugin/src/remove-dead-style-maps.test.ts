import { transformSync } from '@babel/core';
import type { NodePath } from '@babel/core';
import * as babelTypes from '@babel/types';
import { expect, it } from 'vitest';
import type { FileState } from './plugin-types';
import { removeDeadStyleMaps } from './remove-dead-style-maps';

const compile = (source: string, state: FileState) =>
  transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: [
      () => ({
        visitor: {
          Program: {
            exit: (path: NodePath<babelTypes.Program>) => {
              path.scope.crawl();
              removeDeadStyleMaps(path, state);
            },
          },
        },
      }),
    ],
  });

it('removes a style declaration with no remaining references', () => {
  const state = { styles: new Map([['styles', { root: {} }]]) } as unknown as FileState;
  expect(compile('const styles = null;', state)?.code).not.toContain('styles');
});

it('keeps referenced declarations and ignores missing bindings', () => {
  const state = { styles: new Map([['styles', { root: {} }]]) } as unknown as FileState;
  expect(compile('const styles = null; consume(styles);', state)?.code).toContain('styles');
  expect(compile('const other = 1;', state)?.code).toContain('other');
});
