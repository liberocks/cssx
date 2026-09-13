import type { NodePath } from '@babel/core';
import { transformSync } from '@babel/core';
import * as types from '@babel/types';
import { createClassNameAllocator } from '@cssxio/compiler';
import { expect, it } from 'vitest';

import { finalizeFoldedProps } from './finalize-folded-props';
import type { FoldedPropsCall } from './finalize-folded-props';
import type { CssxPluginOptions, FileState } from './plugin-types';
import { transformCssxCall } from './transform-cssx-call';

const importSource = '@cssxio/cssx';

/** Runs the isolated call dispatcher with fresh module state. */
function transformCalls(source: string, options: CssxPluginOptions = {}) {
  let state: FileState | undefined;
  let foldedProps: FoldedPropsCall[] = [];
  const fileName = '/project/App.tsx';
  const result = transformSync(source, {
    babelrc: false,
    configFile: false,
    filename: fileName,
    plugins: [
      () => ({
        visitor: {
          Program: {
            enter() {
              state = {
                classNameAllocator: createClassNameAllocator(),
                styles: new Map(),
                styleCandidates: new Map(),
                styleClasses: new Map(),
                classes: new Map(),
                candidateOrigins: new Map(),
                liveCandidates: new Set(),
                composites: new Map(),
                liveComposites: new Set(),
                liveFallbackClasses: new Set(),
                cssRanges: [],
              };
              foldedProps = [];
            },
            exit(path: NodePath<types.Program>) {
              finalizeFoldedProps(path, types, foldedProps);
            },
          },
          CallExpression(path: NodePath<types.CallExpression>) {
            transformCssxCall({
              path,
              types,
              importSource,
              state: state!,
              options,
              fileName,
              foldedProps,
            });
          },
        },
      }),
    ],
  });

  return { result, state: state! };
}

it('dispatches create, props, and sx calls to their corresponding compiler transforms', () => {
  const { result, state } = transformCalls(`
    import * as cssx from '@cssxio/cssx';
    import { sx } from '@cssxio/cssx';
    const styles = cssx.create({ root: 'p-5' });
    export const props = cssx.props(styles.root);
    export const className = sx('p-4');
  `);

  expect(result?.code).toContain('const styles = {};');
  expect(result?.code).toContain('className:');
  expect(result?.code).toContain('export const className = "');
  expect(state.classes.has('p-5')).toBe(true);
  expect(state.classes.has('p-4')).toBe(true);
});

it('leaves unrelated calls untouched', () => {
  const { result } = transformCalls("other.run('p-4')");

  expect(result?.code).toContain("other.run('p-4')");
});

it('validates computed API access and module-scope create calls before dispatch', () => {
  expect(() => transformCalls("import * as cssx from '@cssxio/cssx'; cssx['create']({ root: 'p-4' });")).toThrow(
    'must use dot notation',
  );
  expect(() =>
    transformCalls("import * as cssx from '@cssxio/cssx'; function render() { cssx.create({ root: 'p-4' }); }"),
  ).toThrow('must be declared at module scope');
});
