import type { NodePath } from '@babel/core';
import type * as babelTypes from '@babel/types';
import type { CallExpression } from '@babel/types';

import { isGeneratedClassNames } from '../analysis/is-generated-class-names';
import { readStaticSxSource } from '../analysis/read-static-sx-source';
import { nextStableCompositeOrdinal } from '../classes/stable-composite-name';
import { compileSxString } from './compile-sx-string';
import type { CompileSxStringContext } from './compile-sx-string';
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
  const stableClassNameIdentity =
    context.stableClassNameStrategy === 'module-order' ? `sx:${nextStableCompositeOrdinal(context.state)}` : undefined;
  const callContext = {
    ...context,
    ...(stableClassNameIdentity ? { stableClassNameIdentity, stableClassNameSegment: { value: 0 } } : {}),
  };
  const staticSource = readStaticSxSource(path.node.arguments, types);
  if (staticSource !== null) {
    if (isGeneratedClassNames(staticSource)) {
      return;
    }
    path.node.arguments.forEach((argument) => recordCssRanges(argument, types, context));
    path.replaceWith(types.stringLiteral(compileSxString(staticSource, callContext, path.node.loc?.start)));
    return;
  }
  const transformed = path.node.arguments.map((argument) =>
    transformSxArgument(argument as babelTypes.Expression | babelTypes.SpreadElement, types, callContext),
  );
  if (transformed.some((argument) => argument === undefined)) {
    return;
  }
  path.node.arguments.forEach((argument) => recordCssRanges(argument, types, context));
  const expressions = transformed.filter((argument): argument is babelTypes.Expression => argument !== undefined);
  path.node.arguments = expressions;
}

/** Records the source ranges of utility literals accepted by `sx()`. */
function recordCssRanges(
  node: babelTypes.Expression | babelTypes.SpreadElement | babelTypes.ArgumentPlaceholder,
  types: typeof babelTypes,
  context: CompileSxStringContext,
): void {
  if (types.isStringLiteral(node)) {
    if (!isGeneratedClassNames(node.value) && typeof node.start === 'number' && typeof node.end === 'number') {
      context.state.cssRanges.push({ start: node.start, end: node.end });
    }
    return;
  }
  if (types.isArrayExpression(node)) {
    /* v8 ignore next -- Sparse arrays make transformSxArgument bail before range collection. */
    node.elements.forEach((element) => {
      if (element) {
        recordCssRanges(element, types, context);
      }
    });
    return;
  }
  if (types.isLogicalExpression(node, { operator: '&&' })) {
    recordCssRanges(node.right, types, context);
    return;
  }
  if (types.isConditionalExpression(node)) {
    recordCssRanges(node.consequent, types, context);
    recordCssRanges(node.alternate, types, context);
  }
}
