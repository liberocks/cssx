import * as babelTypes from '@babel/types';

/**
 * Serializes a compiled utility tuple for record interning.
 *
 * @param record Babel array expression containing one packed utility tuple.
 * @param types Babel node helpers.
 * @returns Stable JSON representation of the tuple's values.
 */
export function packedRecordKey(record: babelTypes.ArrayExpression, types: typeof babelTypes): string {
  return JSON.stringify(
    record.elements.map((value) => (types.isNullLiteral(value) ? null : (value as babelTypes.StringLiteral).value)),
  );
}
