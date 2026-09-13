import { expect, it } from 'vitest';

import { replaceFallbackSelector } from './replace-fallback-selector';

it('rebinds the source utility selector to the generated class selector', () => {
  expect(replaceFallbackSelector('.align-baseline{vertical-align: baseline;}', 'align-baseline', '.x')).toBe(
    '.x{vertical-align: baseline;}',
  );
});

it('matches escaped candidate selectors', () => {
  expect(replaceFallbackSelector('.border\\/50{border-color: currentColor;}', 'border/50', '.x')).toBe(
    '.x{border-color: currentColor;}',
  );
});
