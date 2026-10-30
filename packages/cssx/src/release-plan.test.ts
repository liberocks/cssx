import { describe, expect, it, vi } from 'vitest';

import {
  createAutoReleasePlan,
  createAutoRetryPlan,
  incrementVersion,
  isVersionInRange,
  packageChangedSince,
} from '../../../scripts/release-plan.mjs';
import type { ReleaseBump, ReleaseManifest } from '../../../scripts/release-plan.mjs';

const releases: readonly [ReleaseBump, string, string][] = [
  ['major', '0.2.3', '1.0.0'],
  ['minor', '0.2.3', '0.3.0'],
  ['patch', '0.2.3', '0.2.4'],
];

describe('release plan', () => {
  it('tracks Rust workspace changes for the native package release', async () => {
    const hasChangedPath = vi.fn(
      async (_baseRef: string, directory: string) => directory === 'packages/compiler/native',
    );

    await expect(
      packageChangedSince(
        {
          name: '@cssxio/compiler-native',
          directory: 'packages/compiler-native',
          sourceDirectories: ['packages/compiler/native'],
          dependencies: [],
        },
        'release-baseline',
        hasChangedPath,
      ),
    ).resolves.toBe(true);
    expect(hasChangedPath).toHaveBeenNthCalledWith(1, 'release-baseline', 'packages/compiler-native');
    expect(hasChangedPath).toHaveBeenNthCalledWith(2, 'release-baseline', 'packages/compiler/native');
  });

  it('reports no package changes when all release directories are unchanged', async () => {
    await expect(
      packageChangedSince(
        { name: '@cssxio/compiler-native', directory: 'packages/compiler-native', dependencies: [] },
        'release-baseline',
        async () => false,
      ),
    ).resolves.toBe(false);
  });

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

  it('includes dependents when an optional native dependency changes incompatibly', () => {
    const packages = [
      { name: '@cssxio/compiler-native', directory: 'packages/compiler-native', dependencies: [] },
      {
        name: '@cssxio/unplugin',
        directory: 'packages/unplugin',
        dependencies: ['@cssxio/compiler-native'],
      },
    ];
    const manifests = new Map<string, ReleaseManifest>([
      ['@cssxio/compiler-native', { version: '0.1.0' }],
      ['@cssxio/unplugin', { version: '0.11.0', optionalDependencies: { '@cssxio/compiler-native': '^0.1.0' } }],
    ]);

    expect(createAutoReleasePlan(packages, manifests, new Set(['@cssxio/compiler-native']), 'minor')).toEqual([
      expect.objectContaining({ name: '@cssxio/compiler-native', bump: 'minor', nextVersion: '0.2.0' }),
      expect.objectContaining({ name: '@cssxio/unplugin', bump: 'patch', nextVersion: '0.11.1' }),
    ]);
  });

  it('retries the current versions of every changed package without incrementing them', () => {
    const packages = [
      { name: '@cssxio/compiler', directory: 'packages/compiler', dependencies: [] },
      { name: '@cssxio/babel-plugin', directory: 'packages/babel-plugin', dependencies: ['@cssxio/compiler'] },
    ];
    const manifests = new Map<string, ReleaseManifest>([
      ['@cssxio/compiler', { version: '0.10.0' }],
      ['@cssxio/babel-plugin', { version: '0.8.0', dependencies: { '@cssxio/compiler': '^0.10.0' } }],
    ]);

    expect(
      createAutoRetryPlan(packages, manifests, new Set(['@cssxio/compiler', '@cssxio/babel-plugin']), 'minor'),
    ).toEqual([
      expect.objectContaining({ name: '@cssxio/compiler', version: '0.10.0', nextVersion: '0.10.0' }),
      expect.objectContaining({ name: '@cssxio/babel-plugin', version: '0.8.0', nextVersion: '0.8.0' }),
    ]);
  });

  it('recognizes caret ranges for zero-major package versions', () => {
    expect(isVersionInRange('^0.2.0', '0.2.9')).toBe(true);
    expect(isVersionInRange('^0.2.0', '0.3.0')).toBe(false);
  });
});
