import { expect, it } from 'vitest';

import { compositeIdentity } from './composite-identity';
import { compositeNameIdentity } from './composite-name-identity';
import { residualCompositionIdentities } from './residual-composition-identities';

it('returns unique namespaced identities for non-empty residual compositions', () => {
  const firstIdentity = compositeNameIdentity(compositeIdentity(['a', 'b']));
  const secondIdentity = compositeNameIdentity(compositeIdentity(['c']));

  expect(residualCompositionIdentities([[], ['a', 'b'], ['b', 'a'], ['c']])).toEqual([firstIdentity, secondIdentity]);
});
