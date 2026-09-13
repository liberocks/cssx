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
