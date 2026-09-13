import * as babelTypes from '@babel/types';
import { expect, it } from 'vitest';
import { packedRecordKey } from './packed-record-key';

it('serializes string and null tuple entries into a stable key', () => {
  const record = babelTypes.arrayExpression([
    babelTypes.stringLiteral('atom'),
    babelTypes.stringLiteral('base'),
    babelTypes.nullLiteral(),
  ]);
  expect(packedRecordKey(record, babelTypes)).toBe('["atom","base",null]');
});
