import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = await readFile(
  resolve(import.meta.dirname, '../.github/workflows/prepare-package-versions.yml'),
  'utf8',
);

describe('prepare package versions workflow', () => {
  it('delegates version preparation behavior to independently testable scripts', () => {
    expect(workflow).toContain('pr_id:');
    expect(workflow).toContain('required: false');
    expect(workflow).toContain("if: github.ref == 'refs/heads/main'");
    expect(workflow).toContain('node scripts/prepare-package-versions/resolve-target.mjs');
    expect(workflow).toContain('node scripts/prepare-package-versions/plan.mjs');
    expect(workflow).toContain('node scripts/prepare-package-versions/validate.mjs');
    expect(workflow).toContain('node scripts/prepare-package-versions/apply.mjs');
    expect(workflow).not.toContain('npm_version_is_published()');
    expect(workflow).not.toContain('vscode_version_is_published()');
  });

  it('keeps package-controlled commands ahead of the write-capable App token', () => {
    const tokenIndex = workflow.indexOf('Create version-preparation App token');
    expect(workflow.indexOf('pnpm install --frozen-lockfile')).toBeLessThan(tokenIndex);
    expect(workflow.indexOf('Plan changed package versions')).toBeLessThan(tokenIndex);
    expect(workflow.indexOf('Check planned versions are unpublished')).toBeLessThan(tokenIndex);
    expect(workflow.indexOf('Apply planned versions and update lockfile')).toBeLessThan(tokenIndex);
    expect(workflow.indexOf('Commit and push prepared versions')).toBeGreaterThan(tokenIndex);
    expect(workflow).toContain('git -c core.hooksPath=/dev/null commit');
  });

  it('updates a requested PR directly and preserves the no-PR preparation flow', () => {
    expect(workflow).toContain("if: steps.plan.outputs.has-release == 'true' && inputs.pr_id != ''");
    expect(workflow).toContain("if: steps.plan.outputs.has-release == 'true' && inputs.pr_id == ''");
    expect(workflow).toContain('gh pr create');
    expect(workflow).toContain('--base main');
  });
});
