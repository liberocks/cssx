import type { NodePath } from '@babel/core';
import * as babelTypes from '@babel/types';
import type { CompiledStyle } from '@cssxio/compiler';

/**
 * Reads a member property written with supported static syntax.
 *
 * It accepts dot identifiers and computed string literals. Other computed values return null.
 *
 * @param member Member expression to inspect.
 * @param t Babel node helpers.
 * @returns The static property name, or null when the property is dynamic.
 */
export function memberPropertyName(
  member: import('@babel/types').MemberExpression,
  t: typeof babelTypes,
): string | null {
  if (!member.computed && t.isIdentifier(member.property)) {
    return member.property.name;
  }
  if (member.computed && t.isStringLiteral(member.property)) {
    return member.property.value;
  }
  return null;
}

/**
 * Checks whether a call's local identifier is a named CSSX import.
 *
 * @param path Call expression whose scope is checked.
 * @param localName Local identifier used as the callee.
 * @param importedName CSSX export the binding must name.
 * @param t Babel node helpers.
 * @param importSource Module specifier that exports CSSX.
 * @returns True when the identifier is the requested named import from the configured source.
 */
export function importedFunctionBinding(
  path: NodePath<import('@babel/types').CallExpression>,
  localName: string,
  importedName: 'create' | 'props' | 'sx',
  t: typeof babelTypes,
  importSource: string,
): boolean {
  const binding = path.scope.getBinding(localName);
  const bindingPath = binding?.path;
  if (!bindingPath?.isImportSpecifier()) {
    return false;
  }
  const imported = bindingPath.node.imported;
  const actualName = t.isIdentifier(imported) ? imported.name : imported.value;
  return actualName === importedName && isCssxImport(bindingPath, importSource);
}

/**
 * Checks whether a call's local identifier is a CSSX namespace or default import.
 *
 * @param path Call expression whose scope is checked.
 * @param localName Local namespace or default import identifier.
 * @param importSource Module specifier that exports CSSX.
 * @returns True when the identifier is a namespace or default import from the configured source.
 */
export function importedNamespaceBinding(
  path: NodePath<import('@babel/types').CallExpression>,
  localName: string,
  importSource: string,
): boolean {
  const binding = path.scope.getBinding(localName);
  const bindingPath = binding?.path;
  if (!bindingPath || (!bindingPath.isImportNamespaceSpecifier() && !bindingPath.isImportDefaultSpecifier())) {
    return false;
  }
  return isCssxImport(bindingPath, importSource);
}

/**
 * Checks whether an import specifier belongs to the configured CSSX module.
 *
 * @param path Import specifier path to inspect.
 * @param importSource Module specifier that exports CSSX.
 * @returns True when the specifier is directly inside an import from that source.
 */
export function isCssxImport(path: NodePath, importSource: string): boolean {
  const parent = path.parentPath;
  return parent?.isImportDeclaration() === true && parent.node.source.value === importSource;
}

/**
 * Requires a create call to appear in a direct module statement.
 *
 * @param path Create call to validate.
 * @returns Nothing when the call is at module scope.
 */
export function assertModuleScope(path: NodePath<import('@babel/types').CallExpression>): void {
  const statement = path.getStatementParent();
  const statementParent = statement?.parentPath;
  const isDirectProgramStatement =
    statementParent?.isProgram() ||
    (statementParent?.isExportNamedDeclaration() && statementParent.parentPath.isProgram());
  if (!isDirectProgramStatement) {
    throw diagnosticError(path, 'cssx.create() must be declared at module scope.');
  }
}

/**
 * Rejects computed CSSX API access on namespace and default imports.
 *
 * @param path Call expression to validate.
 * @param t Babel node helpers.
 * @param importSource Module specifier that exports CSSX.
 * @returns Nothing when the call does not use a forbidden computed CSSX API property.
 */
export function assertNoComputedCssxApiCall(
  path: NodePath<import('@babel/types').CallExpression>,
  t: typeof babelTypes,
  importSource: string,
): void {
  const callee = path.node.callee;
  if (
    !t.isMemberExpression(callee) ||
    !callee.computed ||
    !t.isIdentifier(callee.object) ||
    !t.isStringLiteral(callee.property)
  ) {
    return;
  }
  if (
    (callee.property.value === 'create' || callee.property.value === 'props' || callee.property.value === 'sx') &&
    importedNamespaceBinding(path, callee.object.name, importSource)
  ) {
    throw diagnosticError(path, 'CSSX API calls must use dot notation, for example cssx.create(...).');
  }
}

/**
 * Creates a diagnostic error for a source path.
 *
 * @param path Source path where the diagnostic belongs.
 * @param message Error message to show.
 * @returns A plain error in production, or a code-frame error in other environments.
 */
export function diagnosticError(path: NodePath, message: string): Error {
  return process.env.NODE_ENV === 'production' ? new Error(message) : path.buildCodeFrameError(message);
}

/**
 * Reads a static string literal or an unchanged local constant initialized with one.
 *
 * @param path Expression to read.
 * @returns The static string, or null when the expression is not a supported static form.
 */
export function readStaticString(path: NodePath): string | null {
  if (path.isStringLiteral()) {
    return path.node.value;
  }
  if (!path.isIdentifier()) {
    return null;
  }
  const binding = path.scope.getBinding(path.node.name);
  if (!binding?.constant || binding.constantViolations.length !== 0 || !binding.path.isVariableDeclarator()) {
    return null;
  }
  const initializer = binding.path.get('init');
  return initializer.isStringLiteral() ? initializer.node.value : null;
}

/**
 * Creates an object key that preserves the supplied property name.
 *
 * @param key Property name to represent.
 * @param t Babel node helpers.
 * @returns An identifier for valid identifier names, otherwise a string literal.
 */
export function propertyKey(
  key: string,
  t: typeof import('@babel/types'),
