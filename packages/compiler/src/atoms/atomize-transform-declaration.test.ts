import { describe, expect, it } from 'vitest';

import { atomizeTransformDeclaration } from './atomize-transform-declaration';

describe('atomizeTransformDeclaration', () => {
  it('shares a scale sink across independent x and y scale channels', () => {
    const declarations = [
      { property: '--cssx-scale-x', value: '2' },
      { property: '--cssx-scale-y', value: '3' },
      { property: 'scale', value: 'var(--cssx-scale-x) var(--cssx-scale-y)' },
    ];

    expect(atomizeTransformDeclaration(declarations, 0)).toEqual({
      atoms: [
        [declarations[0], declarations[2]],
        [declarations[1], declarations[2]],
      ],
      consumedDeclarations: 2,
    });
  });

  it.each([
    ['--cssx-translate-x', 'translate'],
    ['--cssx-translate-y', 'translate'],
    ['--cssx-scale-x', 'transform'],
    ['--cssx-scale-y', 'scale'],
    ['--cssx-skew-x', 'transform'],
    ['--cssx-skew-y', 'transform'],
  ])('pairs %s with its %s sink', (channel, sinkProperty) => {
    const declarations = [
      { property: channel, value: '1' },
      { property: sinkProperty, value: 'var(--channel)' },
    ];

    expect(atomizeTransformDeclaration(declarations, 0)).toEqual({
      atoms: [declarations],
      consumedDeclarations: 1,
    });
  });

  it('returns undefined for non-transform declarations and unsupported sinks', () => {
    expect(atomizeTransformDeclaration([{ property: 'opacity', value: '1' }], 0)).toBeUndefined();
    expect(
      atomizeTransformDeclaration(
        [
          { property: '--cssx-translate-x', value: '1px' },
          { property: 'opacity', value: '1' },
        ],
        0,
      ),
    ).toBeUndefined();
  });
});
