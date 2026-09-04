import { describe, expect, it } from 'vitest';

import { createAutoReleasePlan, incrementVersion, isVersionInRange } from '../../../scripts/release-plan.mjs';
import type { ReleaseBump, ReleaseManifest } from '../../../scripts/release-plan.mjs';

const releases: readonly [ReleaseBump, string, string][] = [
  ['major', '0.2.3', '1.0.0'],
  ['minor', '0.2.3', '0.3.0'],
  ['patch', '0.2.3', '0.2.4'],
];

describe('release plan', () => {
  it.each(releases)('increments a %s release', (bump, currentVersion, nextVersion) => {
    expect(incrementVersion(currentVersion, bump)).toBe(nextVersion);
  });

  it('includes dependents with incompatible planned internal dependencies', () => {
    const packages = [
      { name: '@cssxio/compiler', directory: 'packages/compiler', dependencies: [] },
      { name: '@cssxio/babel-plugin', directory: 'packages/babel-plugin', dependencies: ['@cssxio/compiler'] },
      {
        name: '@cssxio/unplugin',
        directory: 'packages/unplugin',
        dependencies: ['@cssxio/babel-plugin', '@cssxio/compiler'],
      },
    ];
    const manifests = new Map<string, ReleaseManifest>([
      ['@cssxio/compiler', { version: '0.2.0' }],
      ['@cssxio/babel-plugin', { version: '0.2.1', dependencies: { '@cssxio/compiler': '^0.2.0' } }],
      [
        '@cssxio/unplugin',
        {
          version: '0.2.0',
          dependencies: { '@cssxio/babel-plugin': '^0.2.1', '@cssxio/compiler': '^0.2.0' },
        },
      ],
    ]);

    expect(createAutoReleasePlan(packages, manifests, new Set(['@cssxio/compiler']), 'minor')).toEqual([
      expect.objectContaining({ name: '@cssxio/compiler', bump: 'minor', nextVersion: '0.3.0' }),
      expect.objectContaining({ name: '@cssxio/babel-plugin', bump: 'patch', nextVersion: '0.2.2' }),
      expect.objectContaining({ name: '@cssxio/unplugin', bump: 'patch', nextVersion: '0.2.1' }),
    ]);
  });

  it('recognizes caret ranges for zero-major package versions', () => {
    expect(isVersionInRange('^0.2.0', '0.2.9')).toBe(true);
    expect(isVersionInRange('^0.2.0', '0.3.0')).toBe(false);
  });
});
