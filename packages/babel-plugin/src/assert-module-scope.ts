import type { NodePath } from '@babel/core';

import { diagnosticError } from './diagnostic-error';

/**
 * Requires a create call to appear in a direct module statement.
 *
 * @param path Create call to validate.
 * @returns Nothing when the call is at module scope.
 */
export function assertModuleScope(path: NodePath<import('@babel/types').CallExpression>): void {
  const statement = path.getStatementParent();
  const statementParent = statement?.parentPath;
  const isDirectProgramStatement = statementParent?.isProgram() || statementParent?.isExportNamedDeclaration();
  if (!isDirectProgramStatement) {
    throw diagnosticError(path, 'cssx.create() must be declared at module scope.');
  }
}
