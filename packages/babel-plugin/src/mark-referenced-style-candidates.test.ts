import { transformSync } from '@babel/core';
import type { NodePath } from '@babel/core';
import * as babelTypes from '@babel/types';
import { expect, it } from 'vitest';
import type { CompiledStyle } from '@cssxio/compiler';
import type { FileState } from './plugin-types';
import { markReferencedStyleCandidates } from './mark-referenced-style-candidates';

const createState = (): FileState => {
  const style = (composite: string, atom: string): CompiledStyle => ({
    $$css: 2,
    c: composite,
    _: [[atom, 'base', 'padding']],
  });
  return {
    styles: new Map([
      ['styles', { root: style('composite-root', 'atom-root'), icon: style('composite-icon', 'atom-icon') }],
    ]),
    styleCandidates: new Map([['styles', { root: ['p-4'], icon: ['m-2'] }]]),
    styleClasses: new Map([['styles', { root: 'composite-root', icon: 'composite-icon' }]]),
    liveCandidates: new Set(),
    composites: new Map([
      ['composite-root', ['atom-root']],
      ['composite-icon', ['atom-icon']],
    ]),
    liveComposites: new Set(),
    liveFallbackClasses: new Set(),
  } as unknown as FileState;
};

const analyzeReferences = (source: string, state: FileState): void => {
  transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: [
      () => ({
        visitor: {
          Program: {
            exit: (path: NodePath<babelTypes.Program>) => {
              path.scope.crawl();
              markReferencedStyleCandidates(path, babelTypes, state);
            },
          },
        },
      }),
    ],
  });
};

it('retains only candidates and fallback classes used by static member access', () => {
  const state = createState();
  analyzeReferences('const styles = {}; const selected = styles.root;', state);

  expect(state.liveCandidates).toEqual(new Set(['p-4']));
  expect(state.liveComposites).toEqual(new Set(['composite-root']));
  expect(state.liveFallbackClasses).toEqual(new Set(['atom-root']));
});

it('retains the whole map for dynamic access and non-member references', () => {
  const dynamicState = createState();
  analyzeReferences('const styles = {}; const selected = styles[key];', dynamicState);
  expect(dynamicState.liveCandidates).toEqual(new Set(['p-4', 'm-2']));
  expect(dynamicState.liveComposites).toEqual(new Set(['composite-root', 'composite-icon']));
  expect(dynamicState.liveFallbackClasses).toEqual(new Set(['atom-root', 'atom-icon']));

  const directState = createState();
  analyzeReferences('const styles = {}; consume(styles);', directState);
  expect(directState.liveCandidates).toEqual(new Set(['p-4', 'm-2']));
});
