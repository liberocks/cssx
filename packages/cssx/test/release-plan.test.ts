import { describe, expect, it } from 'vitest';

import { incrementVersion } from '../../../scripts/release-plan.mjs';
import type { ReleaseBump } from '../../../scripts/release-plan.mjs';

const releases: readonly [ReleaseBump, string, string][] = [
  ['major', '0.2.3', '1.0.0'],
  ['minor', '0.2.3', '0.3.0'],
  ['patch', '0.2.3', '0.2.4'],
];

describe('release plan', () => {
  it.each(releases)('increments a %s release', (bump, currentVersion, nextVersion) => {
    expect(incrementVersion(currentVersion, bump)).toBe(nextVersion);
  });
});
