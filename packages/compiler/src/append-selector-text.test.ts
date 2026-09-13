import { expect, it } from 'vitest';

import { appendSelectorText } from './append-selector-text';
import type { SelectorNode } from './parse-selector';

it('appends nonempty selector text after existing nodes', () => {
  const nodes: SelectorNode[] = [{ type: 'nesting' }];

  appendSelectorText(nodes, ' > .child');

  expect(nodes).toEqual([{ type: 'nesting' }, { type: 'text', value: ' > .child' }]);
});

it('does not append an empty selector text segment', () => {
  const nodes: SelectorNode[] = [];

  appendSelectorText(nodes, '');

  expect(nodes).toEqual([]);
});
