import type { NodePath } from '@babel/core';

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
