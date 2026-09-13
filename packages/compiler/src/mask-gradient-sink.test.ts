import { describe, expect, it } from 'vitest';

import { maskGradientSink } from './mask-gradient-sink';

describe('maskGradientSink', () => {
  it('builds radial and conic gradients with their dedicated channels', () => {
    expect(maskGradientSink('radial', 'mask-radial-from')).toMatchObject([
      { property: '--cssx-mask-radial', value: expect.stringContaining('radial-gradient(') },
      { property: 'mask-image', value: 'var(--cssx-mask-radial)' },
    ]);
    expect(maskGradientSink('conic', 'mask-conic-to')[0]?.value).toContain('conic-gradient(');
  });

  it('builds directional and angled linear gradient sinks', () => {
    for (const [family, direction] of [
      ['t', 'to top'],
      ['r', 'to right'],
      ['b', 'to bottom'],
      ['l', 'to left'],
      ['x', 'to right'],
      ['y', 'to bottom'],
    ]) {
      expect(maskGradientSink(family!, `mask-${family}-from`)[0]?.value).toContain(direction!);
    }
    expect(maskGradientSink('linear', 'mask-linear-from')[0]?.value).toContain('var(--cssx-mask-linear-angle, 0deg)');
  });
});
