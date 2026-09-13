import type { NodePath } from '@babel/core';
import { transformSync } from '@babel/core';
import * as types from '@babel/types';
import { compileStyleRecords, createClassNameAllocator } from '@cssxio/compiler';
import { expect, it } from 'vitest';

import { finalizeFoldedProps } from './finalize-folded-props';
import type { FoldedPropsCall } from './finalize-folded-props';
import type { CssxPluginOptions, FileState } from './plugin-types';
import { transformStaticProps } from './transform-static-props';

/** Creates module state containing two compiled style records for direct props-transform tests. */
function createState(): FileState {
  const classNameAllocator = createClassNameAllocator();
  const records = compileStyleRecords({ root: 'p-4', accent: 'bg-red-500' }, { classNameAllocator });

  return {
    classNameAllocator,
    styles: new Map([['styles', records.styles]]),
    styleCandidates: new Map([['styles', records.candidates]]),
    styleClasses: new Map([['styles', records.classNames]]),
    classes: new Map(Object.entries(records.classes)),
    candidateOrigins: new Map(),
    liveCandidates: new Set(),
    composites: new Map(Object.entries(records.composites)),
    liveComposites: new Set(),
    liveFallbackClasses: new Set(),
    cssRanges: [],
  };
}

/** Runs the isolated props handler and applies the queued replacements to source. */
function transformProps(source: string, options: CssxPluginOptions = {}) {
  const state = createState();
  const foldedProps: FoldedPropsCall[] = [];
  const result = transformSync(source, {
    babelrc: false,
    configFile: false,
    filename: '/project/styles.ts',
    plugins: [
      () => ({
        visitor: {
          Program: {
            exit(path: NodePath<types.Program>) {
              finalizeFoldedProps(path, types, foldedProps);
            },
          },
          CallExpression(path: NodePath<types.CallExpression>) {
            const callee = path.node.callee;
            if (
              !types.isMemberExpression(callee) ||
              !types.isIdentifier(callee.object, { name: 'cssx' }) ||
              !types.isIdentifier(callee.property, { name: 'props' })
            ) {
              return;
            }
            transformStaticProps({ path, types, state, options, fileName: '/project/styles.ts', foldedProps });
          },
        },
      }),
    ],
  });

  return { result, state, foldedProps };
}

it('folds one known style and marks its source candidates live', () => {
  const { result, state, foldedProps } = transformProps('cssx.props(styles.root)');

  expect(result?.code).toContain('className:');
  expect(foldedProps).toHaveLength(1);
  expect(state.liveCandidates).toEqual(new Set(['p-4']));
});

it('composes known styles, ignores nullish flags, and tracks the generated composite', () => {
  const { result, state, foldedProps } = transformProps('cssx.props(styles.root, false, null, styles.accent)');

  expect(result?.code).toContain('className:');
  expect(foldedProps).toHaveLength(1);
  expect(state.liveCandidates).toEqual(new Set(['p-4', 'bg-red-500']));
  expect(state.liveComposites.size).toBe(1);
});

it('leaves props calls containing dynamic or spread arguments for runtime evaluation', () => {
  const dynamic = transformProps('cssx.props(styles.root, enabled && styles.accent)');
  const spread = transformProps('cssx.props(...styleArguments)');

  expect(dynamic.result?.code).toContain('cssx.props');
  expect(dynamic.foldedProps).toHaveLength(0);
  expect(spread.result?.code).toContain('cssx.props');
  expect(spread.foldedProps).toHaveLength(0);
});

it('uses source-addressed names for stable compositions', () => {
  const { result } = transformProps('cssx.props(styles.root, styles.accent)', { stableClassNames: true });

  expect(result?.code).toMatch(/className: "d[0-9a-z]+"/);
});
