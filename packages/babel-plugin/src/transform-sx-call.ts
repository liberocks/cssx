import type { NodePath } from '@babel/core';
import * as babelTypes from '@babel/types';
import type { CallExpression } from '@babel/types';

import { compileSxString } from './compile-sx-string';
import type { CompileSxStringContext } from './compile-sx-string';
import { isGeneratedClassNames } from './is-generated-class-names';
import { readStaticSxSource } from './read-static-sx-source';
import { transformSxArgument } from './transform-sx-argument';

/**
 * Transforms one CSSX `sx()` call when its arguments can be partially or fully compiled.
 *
 * @param path `sx()` call path to transform.
 * @param types Babel node helpers.
 * @param context CSSX theme and metadata context for static utility strings.
 * @returns Nothing. Unsupported arguments leave the original call in place.
 */
export function transformSxCall(
  path: NodePath<CallExpression>,
  types: typeof babelTypes,
  context: CompileSxStringContext,
): void {
  const staticSource = readStaticSxSource(path.node.arguments, types);
  if (staticSource !== null) {
    if (isGeneratedClassNames(staticSource)) {
      return;
    }
    path.replaceWith(types.stringLiteral(compileSxString(staticSource, context, path.node.loc?.start)));
    return;
  }
  const transformed = path.node.arguments.map((argument) =>
    transformSxArgument(argument as babelTypes.Expression | babelTypes.SpreadElement, types, context),
  );
  if (transformed.some((argument) => argument === undefined)) {
    return;
  }
  const expressions = transformed.filter((argument): argument is babelTypes.Expression => argument !== undefined);
  path.node.arguments = expressions;
}
