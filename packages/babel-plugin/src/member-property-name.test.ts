import * as t from '@babel/types';
import { expect, it } from 'vitest';

import { memberPropertyName } from './member-property-name';

it('reads dot identifiers and computed string properties only', () => {
  const object = t.identifier('style');
  expect(memberPropertyName(t.memberExpression(object, t.identifier('root')), t)).toBe('root');
  expect(memberPropertyName(t.memberExpression(object, t.stringLiteral('root'), true), t)).toBe('root');
  expect(memberPropertyName(t.memberExpression(object, t.identifier('key'), true), t)).toBeNull();
});
