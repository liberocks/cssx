import { expect, it } from 'vitest';

import { compileFixedModernUtility } from './compile-fixed-modern-utility';

it('resolves fixed containment, SVG, writing-mode, rendering, and font utilities', () => {
  expect(compileFixedModernUtility('contain-layout')).toEqual({ property: 'contain', value: 'layout' });
  expect(compileFixedModernUtility('stroke-cap-round')).toEqual({ property: 'stroke-linecap', value: 'round' });
  expect(compileFixedModernUtility('writing-vertical-rl')).toEqual({ property: 'writing-mode', value: 'vertical-rl' });
  expect(compileFixedModernUtility('shape-rendering-crisp-edges')).toEqual({
    property: 'shape-rendering',
    value: 'crispEdges',
  });
  expect(compileFixedModernUtility('font-synthesis-small-caps')).toEqual({
    property: 'font-synthesis',
    value: 'small-caps',
  });
  expect(compileFixedModernUtility('writing-sideways-rl')).toBeNull();
});
