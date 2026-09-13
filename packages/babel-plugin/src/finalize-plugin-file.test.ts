import type { NodePath, PluginPass } from '@babel/core';
import { transformSync } from '@babel/core';
import * as types from '@babel/types';
import { expect, it } from 'vitest';

import { createPluginFileState } from './create-plugin-file-state';
import type { FoldedPropsCall } from './finalize-folded-props';
import { finalizePluginFile } from './finalize-plugin-file';
import { transformCssxCall } from './transform-cssx-call';

const importSource = '@cssxio/cssx';

/** Compiles source through the call dispatcher and isolated Program finalizer. */
function transformProgram(source: string) {
  let state = createPluginFileState({});
  const foldedProps: FoldedPropsCall[] = [];
  const fileName = '/project/Finalize.tsx';
  const result = transformSync(source, {
    babelrc: false,
    configFile: false,
    filename: fileName,
    plugins: [
      () => ({
        visitor: {
          Program: {
            enter() {
              state = createPluginFileState({});
            },
            exit(program: NodePath<types.Program>, babelState: PluginPass) {
              finalizePluginFile({
                program,
                babelState,
                types,
                importSource,
                state,
                foldedProps,
              });
            },
          },
          CallExpression(path: NodePath<types.CallExpression>) {
            transformCssxCall({
              path,
              types,
              importSource,
              state,
              options: {},
              fileName,
              foldedProps,
            });
          },
        },
      }),
    ],
  });

  return { result, state };
}

it('folds calls, prunes unused styles/imports, and writes only live candidate metadata', () => {
  const { result } = transformProgram(`
    import * as cssx from '@cssxio/cssx';
    const styles = cssx.create({ used: 'p-4', unused: 'bg-red-500' });
    export const props = cssx.props(styles.used);
  `);
  const metadata = (result?.metadata as unknown as { readonly cssx: { readonly candidates: Record<string, string> } })
    .cssx;

  expect(result?.code).not.toContain('@cssxio/cssx');
  expect(Object.keys(metadata.candidates)).toEqual(['p-4']);
});

it('retains a CSSX import that remains referenced by runtime code', () => {
  const { result } = transformProgram(`import * as cssx from '@cssxio/cssx'; export const runtime = cssx;`);
  const metadata = (result?.metadata as unknown as { readonly cssx: { readonly candidates: Record<string, string> } })
    .cssx;

  expect(result?.code).toContain("from '@cssxio/cssx'");
  expect(metadata.candidates).toEqual({});
});
