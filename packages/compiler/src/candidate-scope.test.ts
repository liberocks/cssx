import { expect, it } from 'vitest';

import { candidateScope } from './candidate-scope';

it('includes variants and importance in a merge scope', () => {
  expect(candidateScope({ variants: ['hover'], important: true } as never)).toBe('hover!');
  expect(candidateScope({ variants: [], important: false } as never)).toBe('');
});
