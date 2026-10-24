import { expect, it } from 'vitest';

import { compileAnimationControlUtility } from './compile-animation-control-utility';

it('resolves animation iteration and state controls', () => {
  expect(compileAnimationControlUtility('animation-iterations-infinite', false)).toEqual({
    property: 'animation-iteration-count',
    value: 'infinite',
  });
  expect(compileAnimationControlUtility('animation-iterations-[2.5]', false)?.value).toBe('2.5');
  expect(compileAnimationControlUtility('animation-direction-reverse', false)?.value).toBe('reverse');
  expect(compileAnimationControlUtility('animation-fill-both', false)?.value).toBe('both');
  expect(compileAnimationControlUtility('animation-paused', false)?.value).toBe('paused');
  expect(compileAnimationControlUtility('animation-composition-add', false)?.value).toBe('add');
});

it('rejects invalid and negative animation controls', () => {
  expect(compileAnimationControlUtility('animation-iterations-invalid', false)).toBeNull();
  expect(compileAnimationControlUtility('animation-composition-add', true)).toBeNull();
  expect(compileAnimationControlUtility('animation-unknown', false)).toBeNull();
  expect(compileAnimationControlUtility('animation-duration-100', false)).toBeNull();
});
