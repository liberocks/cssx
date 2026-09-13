import * as babelTypes from '@babel/types';
import { expect, it } from 'vitest';
import { styleMapExpression } from './style-map-expression';

it('creates a Babel object expression from a compiled style map', () => {
  expect(styleMapExpression({}, babelTypes)).toEqual(babelTypes.objectExpression([]));
});
