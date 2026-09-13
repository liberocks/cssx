import { expect, it } from 'vitest';

import type { NativeStyle } from './native-types';
import { visitStyles } from './visit-styles';

it('flattens nested inputs while skipping falsey values', () => {
  const first: NativeStyle = { padding: 8 };
  const second: NativeStyle = { margin: 4 };
  const output: NativeStyle[] = [];

  visitStyles([false, null, undefined, [{ $$cssx: 3, style: first }, [false, { $$cssx: 3, style: second }]]], output);

  expect(output).toEqual([first, second]);
});

it('rejects objects that are not compiled native style records', () => {
  const output: NativeStyle[] = [];

  expect(() => visitStyles([{ style: {} } as never], output)).toThrow('not compiled by CSSX for React Native');
});
