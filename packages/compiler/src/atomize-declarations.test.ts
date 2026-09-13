import { expect, it } from 'vitest';

import { atomizeDeclarations } from './atomize-declarations';

it('keeps transform channels paired with their sink', () => {
  expect(
    atomizeDeclarations([
      { property: '--cssx-translate-x', value: '1px' },
      { property: 'translate', value: 'var(--cssx-translate-x) 0' },
    ]),
  ).toEqual([
    [
      { property: '--cssx-translate-x', value: '1px' },
      { property: 'translate', value: 'var(--cssx-translate-x) 0' },
    ],
  ]);
});

it('groups declarations with matching selector or semantic metadata', () => {
  const declarations = [
    { property: 'color', value: 'red', semanticGroup: 'text-color' },
    { property: 'color', value: 'blue', semanticGroup: 'text-color' },
    { property: 'opacity', value: '1', semanticGroup: 'opacity' },
    { property: 'display', value: 'block', selectorSuffix: '::before' },
    { property: 'color', value: 'red', selectorSuffix: '::before' },
    { property: 'display', value: 'grid' },
  ];

  expect(atomizeDeclarations(declarations)).toEqual([
    [declarations[0], declarations[1]],
    [declarations[2]],
    [declarations[3], declarations[4]],
    [declarations[5]],
  ]);
});
