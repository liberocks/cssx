import type { NodePath, PluginObj, PluginPass } from '@babel/core';
import type * as BabelTypes from '@babel/types';
import type { CallExpression, ObjectExpression } from '@babel/types';
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

function isCreateCall(path: NodePath<CallExpression>, importSource: string, types: typeof BabelTypes): boolean {
  if (!types.isIdentifier(path.node.callee)) {
    return false;
  }
  const binding = path.scope.getBinding(path.node.callee.name);
  const declaration = binding?.path.parentPath?.node;
  return Boolean(
    binding?.path.isImportSpecifier() &&
    types.isIdentifier(binding.path.node.imported, { name: 'create' }) &&
    types.isImportDeclaration(declaration) &&
    declaration.source.value === importSource,
  );
}

function readStyleMap(
  object: ObjectExpression,
  types: typeof BabelTypes,
  path: NodePath<CallExpression>,
): Readonly<Record<string, string>> {
  const input: Record<string, string> = {};
  for (const property of object.properties) {
    if (!types.isObjectProperty(property) || !types.isStringLiteral(property.value)) {
      throw path.buildCodeFrameError('CSSX React Native style values must be static string literals.');
    }
    if (property.computed) {
      throw path.buildCodeFrameError('CSSX React Native style keys must be static.');
    }
    const key = types.isIdentifier(property.key)
      ? property.key.name
      : types.isStringLiteral(property.key) || types.isNumericLiteral(property.key)
        ? String(property.key.value)
        : null;
    if (key === null) {
      throw path.buildCodeFrameError('CSSX React Native style keys must be static.');
    }
    input[key] = property.value.value;
  }
  return input;
}
