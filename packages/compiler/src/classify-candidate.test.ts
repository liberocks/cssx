import { describe, expect, it } from 'vitest';

import { classifyCandidate } from './classify-candidate';

describe('classifyCandidate', () => {
  it('parses and classifies supported candidates with their variant scope', () => {
    expect(classifyCandidate('sm:!p-4')).toEqual(classifyCandidate('sm:p-4!'));
    expect(classifyCandidate('p-4')).toMatchObject({ group: 'p', scope: '' });
  });

  it('returns null for unsupported candidates', () => {
    expect(classifyCandidate('not-a-utility')).toBeNull();
  });
});
