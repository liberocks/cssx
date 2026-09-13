import { describe, expect, it } from 'vitest';

import { parseCandidate } from './candidate';
import { classifyParsedCandidate } from './classify-parsed-candidate';

describe('classifyParsedCandidate', () => {
  it('returns directional conflicts and selector scope for recognized groups', () => {
    expect(classifyParsedCandidate(parseCandidate('sm:!p-4'))).toEqual({
      scope: 'sm!',
      group: 'p',
      conflicts: ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe'],
    });
  });

  it('uses fallback semantics when a candidate is not in the static group tables', () => {
    expect(classifyParsedCandidate(parseCandidate('border/50'))).toEqual({
      scope: '',
      group: 'fallback-noop',
      conflicts: ['fallback-noop'],
    });
  });

  it('returns null when neither a group nor fallback recipe exists', () => {
    expect(classifyParsedCandidate(parseCandidate('not-a-utility'))).toBeNull();
  });
});
