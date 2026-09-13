import { transformSync } from '@babel/core';
import type { NodePath } from '@babel/core';
import * as babelTypes from '@babel/types';
import { compileStyleRecords } from '@cssxio/compiler';
import { expect, it } from 'vitest';

import { materializeLiveStyleMaps } from './materialize-live-style-maps';
import type { FileState } from './plugin-types';

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
              materializeLiveStyleMaps(path, babelTypes, state);
            },
          },
        },
      }),
    ],
  });

it('replaces a referenced style map with its compiled runtime shape', () => {
  const state = {
    styles: new Map([['styles', compileStyleRecords({ root: 'p-4' }).styles]]),
  } as unknown as FileState;
  const result = compile('const styles = null; consume(styles);', state);

  expect(result?.code).toContain('$$css');
  expect(result?.code).toContain('c:');
});

it('skips absent bindings and style maps without runtime references', () => {
  const state = {
    styles: new Map([['styles', compileStyleRecords({ root: 'p-4' }).styles]]),
  } as unknown as FileState;
  expect(compile('const styles = null;', state)?.code).toContain('const styles = null');
  expect(compile('const other = 1;', state)?.code).toContain('const other = 1');
});
