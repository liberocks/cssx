import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

import { runNode } from './run-node';

it('runs a JavaScript file with the current Node executable', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cssx-node-runner-'));
  try {
    const script = join(directory, 'fixture.mjs');
    await writeFile(script, 'process.stdout.write("ok");');

    await expect(runNode(script)).resolves.toEqual({ stdout: 'ok', stderr: '' });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
