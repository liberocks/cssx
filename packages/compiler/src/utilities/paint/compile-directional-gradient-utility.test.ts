import { expect, it } from 'vitest';

import { compileDirectionalGradientUtility } from './compile-directional-gradient-utility';

it('resolves directional linear gradients and interpolation modes', () => {
  expect(compileDirectionalGradientUtility('bg-linear-to-tr')?.[0]?.value).toContain('to top right');
  expect(compileDirectionalGradientUtility('bg-linear-to-r/longer')?.[0]?.value).toContain(
    'linear-gradient(in oklch longer hue to right',
  );
  expect(compileDirectionalGradientUtility('bg-linear-to-bl/oklab')?.[0]?.value).toContain('in oklab to bottom left');
  expect(compileDirectionalGradientUtility('bg-linear-to-center')).toBeNull();
});
