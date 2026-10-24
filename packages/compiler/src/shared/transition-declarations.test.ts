import { describe, expect, it } from 'vitest';

import { transitionDeclarations } from './transition-declarations';

describe('transitionDeclarations', () => {
  it('adds CSSX transition defaults to a property list', () => {
    expect(transitionDeclarations('opacity, transform')).toEqual([
      { property: 'transition-property', value: 'opacity, transform' },
      { property: 'transition-duration', value: '150ms' },
      { property: 'transition-timing-function', value: 'cubic-bezier(.4, 0, .2, 1)' },
    ]);
  });
});
