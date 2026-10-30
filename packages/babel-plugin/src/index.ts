import type { PluginObj, PluginPass } from '@babel/core';
import type * as babelTypes from '@babel/types';
import { relative, resolve, sep } from 'node:path';

import { createPluginFileState } from './state/create-plugin-file-state';
import { finalizePluginFile } from './state/finalize-plugin-file';
import type { CssxPluginOptions } from './state/plugin-types';
import type { FoldedPropsCall } from './transforms/finalize-folded-props';
import { transformCssxCall } from './transforms/transform-cssx-call';

/** Default module specifier used when the plugin options do not override it. */
const DEFAULT_IMPORT_SOURCE = '@cssxio/cssx';

export type { CssxPluginOptions } from './state/plugin-types';
export { cssOnlySignature } from './state/css-only-signature';

/**
 * Compiles CSSX calls in one source module.
 *
 * Program entry creates fresh file state. Call visits compile create, props, and sx calls.
 * Program exit finds reachable candidates, removes unused CSSX imports, and writes metadata.
 * Metadata has a cssx property with candidates mapped to class names and first source origins.
 * Only reachable candidates are included. Origin lines are zero-based and columns are zero-based.
 *
 * @param api The compiler API.
 * @param api.types Helpers for creating source code nodes.
 * @param api.assertVersion Checks the supported compiler version.
 * @param options Plugin options.
 * @returns A compiler plugin that transforms CSSX calls.
 */
export default function cssxBabelPlugin(
  api: { readonly types: typeof babelTypes; assertVersion(version: number): void },
  options: CssxPluginOptions = {},
): PluginObj<PluginPass> {
  api.assertVersion(7);
  const t = api.types;
  const importSource = options.importSource ?? DEFAULT_IMPORT_SOURCE;
  let state = createPluginFileState(options);
  let fileName = '';
  let foldedProps: FoldedPropsCall[] = [];

  return {
    name: '@cssxio/babel-plugin',
    visitor: {
      Program: {
        enter(_path, babelState) {
          const sourceFileName = babelState.file.opts.filename ?? '';
          fileName =
            options.stableClassNameFileName ??
            (options.stableClassNames && sourceFileName
              ? relative(process.cwd(), resolve(sourceFileName)).replaceAll(sep, '/')
              : sourceFileName);
          state = createPluginFileState(options);
          foldedProps = [];
        },
        exit(path, babelState) {
          finalizePluginFile({ program: path, babelState, types: t, importSource, state, foldedProps });
        },
      },
      CallExpression(path) {
        transformCssxCall({ path, types: t, importSource, state, options, fileName, foldedProps });
      },
    },
  };
}
