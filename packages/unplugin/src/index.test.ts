import { expect, it } from 'vitest';

import * as unpluginExports from './index';

it('re-exports the default plugin and build-tool adapters', () => {
  expect(unpluginExports.unpluginFactory).toBeTypeOf('function');
  expect(unpluginExports.default).toBe(unpluginExports.unplugin);
  expect(unpluginExports.vite).toBeTypeOf('function');
  expect(unpluginExports.rollup).toBeTypeOf('function');
  expect(unpluginExports.webpack).toBeTypeOf('function');
  expect(unpluginExports.rspack).toBeTypeOf('function');
  expect(unpluginExports.esbuild).toBeTypeOf('function');
});
