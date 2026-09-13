import * as t from '@babel/types';
import { expect, it } from 'vitest';

import { objectPropertyName } from './object-property-name';

it('reads identifier, string, and numeric keys while rejecting other expressions', () => {
  expect(objectPropertyName(t.objectProperty(t.identifier('root'), t.nullLiteral()), t)).toBe('root');
  expect(objectPropertyName(t.objectProperty(t.stringLiteral('root'), t.nullLiteral()), t)).toBe('root');
  expect(objectPropertyName(t.objectProperty(t.numericLiteral(1), t.nullLiteral()), t)).toBe('1');
  expect(objectPropertyName(t.objectProperty(t.bigIntLiteral('1'), t.nullLiteral()), t)).toBeNull();
});
