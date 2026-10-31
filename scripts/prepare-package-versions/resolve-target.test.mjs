import { describe, expect, it } from 'vitest';

import { resolveTarget } from './resolve-target.mjs';

const sha = 'a'.repeat(40);
const pr = {
  state: 'open',
  base: { ref: 'main', sha, repo: { full_name: 'liberocks/cssx' } },
  head: { ref: 'perf/test', sha: 'b'.repeat(40), repo: { full_name: 'liberocks/cssx' } },
};
const base = { bump: 'minor', repository: 'liberocks/cssx', githubSha: sha, runId: '42' };

describe('resolveTarget', () => {
  it('creates a version branch from main when no PR is selected', () => {
    expect(resolveTarget(base)).toEqual({ kind: 'main', sha, baseSha: sha, branch: 'versions/minor-42' });
  });

  it('targets an open same-repository PR branch', () => {
    expect(resolveTarget({ ...base, prId: '12', pullRequest: pr })).toEqual({
      kind: 'pull-request',
      sha: 'b'.repeat(40),
      baseSha: sha,
      branch: 'perf/test',
    });
  });

  it.each([
    ['invalid PR number', { prId: '0', pullRequest: pr }],
    ['closed PR', { prId: '12', pullRequest: { ...pr, state: 'closed' } }],
    ['wrong base', { prId: '12', pullRequest: { ...pr, base: { ...pr.base, ref: 'release' } } }],
    ['fork PR', { prId: '12', pullRequest: { ...pr, head: { ...pr.head, repo: { full_name: 'other/cssx' } } } }],
    ['invalid head SHA', { prId: '12', pullRequest: { ...pr, head: { ...pr.head, sha: 'bad' } } }],
  ])('rejects %s', (_label, options) => {
    expect(() => resolveTarget({ ...base, ...options })).toThrow();
  });
});
