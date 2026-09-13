import type * as babelTypes from '@babel/types';

import { compileSxString } from './compile-sx-string';
import type { CompileSxStringContext } from './compile-sx-string';
import { isGeneratedClassNames } from './is-generated-class-names';

/**
 * Transforms one `sx()` argument when its nested static forms are supported.
 *
 * It compiles string literals, maps arrays recursively, and preserves supported runtime
 * expressions. Spreads and unsupported nested array elements stop folding for the whole call.
 *
 * @param node Sx argument or nested array element to transform.
 * @param types Babel node helpers.
 * @param context CSSX theme and metadata context for static strings.
 * @returns A transformed expression, or undefined when this input prevents static transformation.
 */
export function transformSxArgument(
  node: babelTypes.Expression | babelTypes.SpreadElement,
  types: typeof babelTypes,
  context: CompileSxStringContext,
): babelTypes.Expression | undefined {
  if (types.isSpreadElement(node)) {
    return undefined;
  }
  if (types.isStringLiteral(node)) {
    if (isGeneratedClassNames(node.value)) {
      return node;
    }
    return types.stringLiteral(compileSxString(node.value, context, node.loc?.start));
  }
  if (types.isNullLiteral(node) || types.isBooleanLiteral(node, { value: false })) {
    return types.stringLiteral('');
  }
  if (types.isArrayExpression(node)) {
    const elements = node.elements.map((element) =>
      element && !types.isSpreadElement(element) ? transformSxArgument(element, types, context) : undefined,
    );
    if (elements.some((element) => element === undefined)) {
      return undefined;
    }
    const values = elements.filter((element): element is babelTypes.Expression => element !== undefined);
    return types.arrayExpression(values);
  }
  if (types.isLogicalExpression(node, { operator: '&&' })) {
    const right = transformSxArgument(node.right, types, context);
    return right ? types.logicalExpression('&&', node.left, right) : undefined;
  }
  if (types.isConditionalExpression(node)) {
    const consequent = transformSxArgument(node.consequent, types, context);
    const alternate = transformSxArgument(node.alternate, types, context);
    return consequent && alternate ? types.conditionalExpression(node.test, consequent, alternate) : undefined;
  }
  return node;
}
