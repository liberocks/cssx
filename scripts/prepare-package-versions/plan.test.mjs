import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { createVersionPlan, hasVersionPreparationCommit, summarizePlan } from './plan.mjs';

const sha = 'a'.repeat(40);

describe('package version planning', () => {
  it('recognizes a previous version-preparation commit', () => {
    expect(hasVersionPreparationCommit('feat: change compiler\nchore(release): prepare minor package versions\n')).toBe(
      true,
    );
    expect(hasVersionPreparationCommit('feat: change compiler\n')).toBe(false);
  });

  it('summarizes selected packages', () => {
    expect(summarizePlan({ packages: [{ name: '@cssxio/compiler', version: '1.0.0', nextVersion: '2.0.0' }] })).toBe(
      '## Planned package versions\n- @cssxio/compiler: 1.0.0 → 2.0.0',
    );
  });

  it('runs the trusted planner and records its package plan', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cssx-version-plan-'));
    const planPath = join(directory, 'plan.json');
    const outputPath = join(directory, 'output');
    const summaryPath = join(directory, 'summary');
    const execute = vi.fn(async (_command, _args, options) => {
      await writeFile(
        planPath,
        JSON.stringify({ packages: [{ name: '@cssxio/compiler', version: '1.0.0', nextVersion: '1.1.0' }] }),
      );
      expect(options.env.GITHUB_OUTPUT).toBe('');
      return { stdout: '' };
    });
    try {
      const result = await createVersionPlan({
        bump: 'minor',
        plannerPath: '/trusted/release-plan.mjs',
        planPath,
        githubOutput: outputPath,
        stepSummary: summaryPath,
        execute,
      });
      expect(result.plan.packages).toHaveLength(1);
      expect(result.alreadyPrepared).toBe(false);
      expect(execute).toHaveBeenCalledWith(
        process.execPath,
        ['/trusted/release-plan.mjs', 'plan', '--package', 'auto', '--bump', 'minor', '--output', planPath],
        expect.objectContaining({ env: expect.any(Object) }),
      );
      expect(await readFile(outputPath, 'utf8')).toContain('has-release=true');
      expect(await readFile(summaryPath, 'utf8')).toContain('@cssxio/compiler');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('skips duplicate version updates and writes false outputs', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cssx-version-plan-'));
    const planPath = join(directory, 'plan.json');
    const outputPath = join(directory, 'output');
    const summaryPath = join(directory, 'summary');
    try {
      const result = await createVersionPlan({
        bump: 'minor',
        prId: '5',
        targetSha: sha,
        targetBaseSha: 'b'.repeat(40),
        plannerPath: '/unused',
        planPath,
        githubOutput: outputPath,
        stepSummary: summaryPath,
        execute: async () => ({ stdout: 'chore(release): prepare minor package versions\n' }),
      });
      expect(result.alreadyPrepared).toBe(true);
      expect(result.plan.packages).toEqual([]);
      expect(await readFile(outputPath, 'utf8')).toContain('has-release=false');
      expect(await readFile(summaryPath, 'utf8')).toContain('already contains');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
