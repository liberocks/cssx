import { expect, it } from 'vitest';

import { compileCoreLayoutExactUtility } from './compile-core-layout-exact-utility';

it('resolves exact layout, aspect, object-fit, and touch-action utilities', () => {
  expect(compileCoreLayoutExactUtility('isolate')).toEqual({ property: 'isolation', value: 'isolate' });
  expect(compileCoreLayoutExactUtility('aspect-video')).toEqual({ property: 'aspect-ratio', value: '16 / 9' });
  expect(compileCoreLayoutExactUtility('object-scale-down')).toEqual({ property: 'object-fit', value: 'scale-down' });
  expect(compileCoreLayoutExactUtility('touch-pinch-zoom')).toEqual({ property: 'touch-action', value: 'pinch-zoom' });
  expect(compileCoreLayoutExactUtility('object-top')).toBeNull();
});
