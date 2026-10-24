import { expect, it } from 'vitest';

import { createClassNameAllocator } from '../atoms/class-name-allocator';
import { createAtomIdentities } from '../atoms/create-atom-identities';
import { compileCandidates } from '../compiler/compile-candidates';
import { parseTheme } from '../theme/theme';
import { createStyleMapCompositionRecords } from './create-style-map-composition-records';

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
