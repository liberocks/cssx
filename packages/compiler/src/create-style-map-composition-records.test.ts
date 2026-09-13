import { expect, it } from 'vitest';

import { createClassNameAllocator } from './class-name-allocator';
import { compileCandidates } from './compile-candidates';
import { createAtomIdentities } from './create-atom-identities';
import { createStyleMapCompositionRecords } from './create-style-map-composition-records';
import { parseTheme } from './theme';

it('creates independent conflict records and packed atoms for each style entry', () => {
  const candidates = ['p-4', 'px-2'];
  const theme = parseTheme();
  const compiled = compileCandidates(candidates, theme);
  const identities = createAtomIdentities(candidates, theme, compiled, createClassNameAllocator());
  const result = createStyleMapCompositionRecords(
    { button: { base: ['p-4', 'px-2'], icon: ['p-4'] } },
    compiled,
    identities.symbols,
  );

  expect(result.recordsByMap.button?.base?.filter(([className]) => className !== null)).toHaveLength(3);
  expect(result.recordsByMap.button?.icon?.filter(([className]) => className !== null)).toHaveLength(1);
  expect(result.compositionAtomsByMap.button?.base).toEqual(expect.arrayContaining([...identities.symbols['p-4']!]));
});

it('returns empty record maps when there are no style maps', () => {
  expect(createStyleMapCompositionRecords({}, new Map(), {})).toEqual({ recordsByMap: {}, compositionAtomsByMap: {} });
});
