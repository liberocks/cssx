import type { NodePath } from '@babel/core';
import type * as babelTypes from '@babel/types';
import type { CallExpression, Program } from '@babel/types';

/** A static props call that can be replaced after collection is complete. */
export interface FoldedPropsCall {
  /** Babel path to the source call. */
  readonly path: NodePath<CallExpression>;
  /** Compiled class string written to the replacement object. */
  readonly className: string;
}

/**
 * Emits compact static props after all foldable calls in the module are known.
 *
 * @param program Babel path for the containing module.
 * @param types Babel node builders.
 * @param foldedProps Static calls and their compiled class names.
 */
export function finalizeFoldedProps(
  program: NodePath<Program>,
  types: typeof babelTypes,
  foldedProps: readonly FoldedPropsCall[],
): void {
  if (foldedProps.length === 0) {
    return;
  }
  const declarations: babelTypes.VariableDeclarator[] = [];
  const useHelper = foldedProps.length >= 4;
  const helper = useHelper ? program.scope.generateUidIdentifier('cssxProps') : undefined;
  if (helper) {
    declarations.push(
      types.variableDeclarator(
        helper,
        types.arrowFunctionExpression(
          [types.identifier('className')],
          types.objectExpression([types.objectProperty(types.identifier('className'), types.identifier('className'))]),
        ),
      ),
    );
  }
  if (declarations.length > 0) {
    program.unshiftContainer('body', types.variableDeclaration('const', declarations));
  }
  for (const { path, className } of foldedProps) {
    path.replaceWith(
      helper
        ? types.callExpression(helper, [types.stringLiteral(className)])
        : types.objectExpression([types.objectProperty(types.identifier('className'), types.stringLiteral(className))]),
    );
  }
}
