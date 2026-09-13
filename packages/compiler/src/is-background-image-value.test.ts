import { expect, it } from 'vitest';
import { isBackgroundImageValue } from './is-background-image-value';

it('recognizes supported background image forms', () => {
  expect(isBackgroundImageValue('url(/hero.png)')).toBe(true);
  expect(isBackgroundImageValue('image:linear-gradient(red, blue)')).toBe(true);
  expect(isBackgroundImageValue('#123456')).toBe(false);
});
