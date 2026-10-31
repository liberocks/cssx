import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = await readFile(resolve(import.meta.dirname, '../.github/workflows/release-packages.yml'), 'utf8');

describe('release workflow formatter verification', () => {
  it('tests the staged native formatter separately from full parser-fallback coverage', () => {
    const nativeTest = workflow.indexOf('packages/formatter/tests/integration/format-source.integration.test.ts');
    const releaseChecks = workflow.indexOf('run: pnpm test:release');
    expect(nativeTest).toBeGreaterThan(-1);
    expect(workflow).toContain("CSSX_TEST_NATIVE_COMPILER: '1'");
    expect(releaseChecks).toBeGreaterThan(nativeTest);
    expect(workflow).toContain("CSSX_DISABLE_NATIVE_COMPILER: '1'");
  });
});
