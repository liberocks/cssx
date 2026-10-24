import { expect, it } from 'vitest';

import { EXACT_TEXT_FLOW_DECLARATIONS } from './utility-exact-text-flow';

it('resolves fixed truncation, wrapping, hyphenation, and list declarations', () => {
  expect(Object.keys(EXACT_TEXT_FLOW_DECLARATIONS)).toHaveLength(25);
  expect(EXACT_TEXT_FLOW_DECLARATIONS.truncate).toEqual([
    { property: 'overflow', value: 'hidden', semanticGroup: 'truncate' },
    { property: 'text-overflow', value: 'ellipsis', semanticGroup: 'truncate' },
    { property: 'white-space', value: 'nowrap', semanticGroup: 'truncate' },
  ]);
  expect(EXACT_TEXT_FLOW_DECLARATIONS['hyphens-auto']).toEqual([
    { property: '-webkit-hyphens', value: 'auto', semanticGroup: 'hyphens' },
    { property: 'hyphens', value: 'auto', semanticGroup: 'hyphens' },
  ]);
  expect(EXACT_TEXT_FLOW_DECLARATIONS['wrap-anywhere']).toEqual([{ property: 'overflow-wrap', value: 'anywhere' }]);
});
