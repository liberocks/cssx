import type { PluginObj, PluginPass } from '@babel/core';
import type * as BabelTypes from '@babel/types';

import { isCreateCall, readStyleMap } from './babel-helpers';
import { create, type NativeCompilerOptions } from './index';

export interface NativeBabelOptions extends NativeCompilerOptions {
  readonly importSource?: string;
}

/** Compiles object-literal create calls imported from the React Native runtime. */
export default function cssxReactNativeBabelPlugin(
  api: { readonly types: typeof BabelTypes; assertVersion(version: number): void },
  options: NativeBabelOptions = {},
): PluginObj<PluginPass> {
  api.assertVersion(7);
  const types = api.types;
  const importSource = options.importSource ?? '@cssxio/react-native';
  return {
    name: '@cssxio/react-native/babel',
    visitor: {
      CallExpression(path) {
        if (!isCreateCall(path, importSource, types)) {
          return;
        }
        const argument = path.node.arguments[0];
        if (path.node.arguments.length !== 1 || !types.isObjectExpression(argument)) {
          throw path.buildCodeFrameError('cssx.create() expects one object literal argument.');
        }
        const input = readStyleMap(argument, types, path);
        path.replaceWith(types.valueToNode(create(input, options)));
      },
    },
  };
}
