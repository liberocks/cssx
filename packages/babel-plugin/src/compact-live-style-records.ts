import type { NodePath } from '@babel/core';
import type * as babelTypes from '@babel/types';

import { packedRecordKey } from './packed-record-key';
import type { FileState } from './plugin-types';

/**
 * Interns repeated utility tuples when a compiled style map remains live at runtime.
 *
 * @param program Program whose runtime style declarations are inspected.
 * @param types Babel node helpers.
 * @param state Per-file compiler state containing live style maps.
 * @returns Nothing after replacing repeated tuples with shared declarations.
 */
export function compactLiveStyleRecords(
  program: NodePath<babelTypes.Program>,
  types: typeof babelTypes,
  state: FileState,
): void {
  for (const styleName of state.styles.keys()) {
    const binding = program.scope.getBinding(styleName);
    if (!binding?.path.isVariableDeclarator() || !binding.path.parentPath?.isVariableDeclaration()) {
      continue;
    }
    const entries = new Map<string, { record: babelTypes.ArrayExpression; uses: number }>();
    const recordArrays: {
      readonly records: babelTypes.ArrayExpression;
      readonly index: number;
      readonly record: babelTypes.ArrayExpression;
    }[] = [];
    const styles = binding.path.node.init as babelTypes.ObjectExpression;
    for (const property of styles.properties) {
      const style = property as babelTypes.ObjectProperty;
      const records = (style.value as babelTypes.ObjectExpression).properties.find(
        (styleProperty) =>
          types.isObjectProperty(styleProperty) && types.isIdentifier(styleProperty.key, { name: '_' }),
      ) as babelTypes.ObjectProperty;
      const recordValues = records.value as babelTypes.ArrayExpression;
      for (let index = 0; index < recordValues.elements.length; index++) {
        const record = recordValues.elements[index] as babelTypes.ArrayExpression;
        const key = packedRecordKey(record, types);
        const entry = entries.get(key) ?? { record, uses: 0 };
        entry.uses++;
        entries.set(key, entry);
        recordArrays.push({ records: recordValues, index, record });
      }
    }
    const interned = new Map<string, babelTypes.Identifier>();
    const declarations: babelTypes.VariableDeclarator[] = [];
    for (const [key, entry] of entries) {
      if (entry.uses < 2) {
        continue;
      }
      const identifier = program.scope.generateUidIdentifier('c');
      interned.set(key, identifier);
      declarations.push(types.variableDeclarator(identifier, entry.record));
    }
    if (declarations.length === 0) {
      continue;
    }
    for (const { records, index, record } of recordArrays) {
      const identifier = interned.get(packedRecordKey(record, types));
      if (!identifier) {
        continue;
      }
      records.elements[index] = types.identifier(identifier.name);
    }
    const declaration = binding.path.parentPath;
    const statement = declaration.parentPath?.isExportNamedDeclaration() ? declaration.parentPath : declaration;
    statement.insertBefore(types.variableDeclaration('const', declarations));
  }
}
