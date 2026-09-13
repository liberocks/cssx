import { expect, it } from 'vitest';

import { runCommand } from './run-command';

it('captures output and the requested working directory', async () => {
  const result = await runCommand(process.execPath, ['-e', 'process.stdout.write(process.cwd())']);

  expect(result.stdout).toBe(process.cwd());
  expect(result.stderr).toBe('');
});

it('reports child-process stderr and startup errors', async () => {
  await expect(
    runCommand(process.execPath, ['-e', 'process.stderr.write("runner failed"); process.exit(1)']),
  ).rejects.toThrow('Package contract runner failed: runner failed');
  await expect(runCommand('cssx-command-that-does-not-exist', [])).rejects.toThrow('Package contract runner failed:');
});
