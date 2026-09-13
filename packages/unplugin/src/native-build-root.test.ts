import { expect, it } from 'vitest';

import { nativeBuildRoot } from './native-build-root';

it('reads native loader roots and ignores non-native contexts', () => {
  expect(
    nativeBuildRoot({
      getNativeBuildContext: () => ({ framework: 'webpack', loaderContext: { rootContext: '/app' } }),
    }),
  ).toBe('/app');
  expect(nativeBuildRoot({ getNativeBuildContext: () => ({ framework: 'rspack' }) })).toBe(process.cwd());
  expect(nativeBuildRoot({ getNativeBuildContext: () => ({ framework: 'vite' }) })).toBeUndefined();
  expect(nativeBuildRoot({})).toBeUndefined();
});
