import type * as babelTypes from '@babel/types';
import type { CompiledStyle } from '@cssxio/compiler';

/** Converts a compiled style map into the corresponding runtime object expression. */
export function styleMapExpression(
  styles: Readonly<Record<string, CompiledStyle>>,
  types: typeof babelTypes,
): import('@babel/types').ObjectExpression {
  return types.valueToNode(styles) as import('@babel/types').ObjectExpression;
}
