import { expect, it } from 'vitest';

import type { SelectorNode } from '../variants/parse-selector';
import { appendSelectorText } from './append-selector-text';

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
