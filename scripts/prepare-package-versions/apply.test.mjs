import { describe, expect, it, vi } from 'vitest';

import { applyVersionPlan } from './apply.mjs';

describe('applyVersionPlan', () => {
  it('applies manifests and regenerates the lockfile in order', async () => {
    const execute = vi.fn().mockResolvedValue({ stdout: '' });
    await applyVersionPlan({ planPath: '/tmp/plan.json', plannerPath: '/tmp/planner.mjs', execute });
    expect(execute.mock.calls.map(([command, args]) => [command, args])).toEqual([
      [process.execPath, ['/tmp/planner.mjs', 'apply', '--input', '/tmp/plan.json']],
      ['pnpm', ['install', '--no-frozen-lockfile', '--config.link-workspace-packages=true']],
      ['pnpm', ['exec', 'prettier', 'pnpm-lock.yaml', '--write']],
    ]);
  });
});
