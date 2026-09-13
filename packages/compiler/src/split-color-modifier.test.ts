import { expect, it } from 'vitest';
import { splitColorModifier } from './split-color-modifier';

it('splits only top-level opacity modifiers', () => {
  expect(splitColorModifier('red-500/50')).toEqual({ value: 'red-500', opacity: '50' });
  expect(splitColorModifier('[color:rgb(1/2/3)]/25')).toEqual({ value: '[color:rgb(1/2/3)]', opacity: '25' });
  expect(splitColorModifier('red-500')).toEqual({ value: 'red-500' });
});
