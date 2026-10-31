import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function applyVersionPlan({ planPath, plannerPath, execute = execFileAsync }) {
  if (!planPath || !plannerPath) throw new Error('Plan path and planner path are required.');
  await execute(process.execPath, [plannerPath, 'apply', '--input', planPath]);
  await execute('pnpm', ['install', '--no-frozen-lockfile', '--config.link-workspace-packages=true']);
  await execute('pnpm', ['exec', 'prettier', 'pnpm-lock.yaml', '--write']);
}

async function main() {
  await applyVersionPlan({
    planPath: process.env.RELEASE_PLAN_INPUT,
    plannerPath: process.env.RELEASE_PLANNER,
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
