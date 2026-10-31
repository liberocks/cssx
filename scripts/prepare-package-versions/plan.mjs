import { execFile } from 'node:child_process';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export function hasVersionPreparationCommit(messages) {
  return messages.split('\n').some((message) => message.startsWith('chore(release): prepare '));
}

export function summarizePlan(plan) {
  if (plan.packages.length === 0) return 'No packages changed since their latest release tags.';
  return [
    '## Planned package versions',
    ...plan.packages.map((packageInfo) => `- ${packageInfo.name}: ${packageInfo.version} → ${packageInfo.nextVersion}`),
  ].join('\n');
}

export async function createVersionPlan({
  bump,
  prId = '',
  targetSha,
  targetBaseSha,
  plannerPath,
  planPath,
  githubOutput,
  stepSummary,
  execute = execFileAsync,
  read = readFile,
  write = writeFile,
  append = appendFile,
}) {
  if (!['major', 'minor', 'patch'].includes(bump)) throw new Error(`Unsupported bump type: ${bump}`);
  if (!plannerPath || !planPath) throw new Error('Planner path and plan path are required.');

  let alreadyPrepared = false;
  if (prId) {
    if (
      !/^[1-9][0-9]*$/.test(prId) ||
      !/^[0-9a-f]{40}$/.test(targetSha ?? '') ||
      !/^[0-9a-f]{40}$/.test(targetBaseSha ?? '')
    ) {
      throw new Error('A valid PR number, head SHA, and base SHA are required for PR preparation.');
    }
    const { stdout } = await execute('git', ['log', '--format=%s', `${targetBaseSha}..${targetSha}`]);
    alreadyPrepared = hasVersionPreparationCommit(stdout);
  }

  let plan;
  if (alreadyPrepared) {
    plan = { bump, mode: 'auto', packages: [] };
    await write(planPath, `${JSON.stringify(plan, null, 2)}\n`);
  } else {
    await execute(process.execPath, [plannerPath, 'plan', '--package', 'auto', '--bump', bump, '--output', planPath], {
      env: { ...process.env, GITHUB_OUTPUT: '' },
    });
    plan = JSON.parse(await read(planPath, 'utf8'));
  }

  const outputs = [
    `has-release=${String(plan.packages.length > 0)}`,
    `release-count=${plan.packages.length}`,
    `requires-version-bump=${String(plan.packages.length > 0)}`,
  ];
  if (githubOutput) await append(githubOutput, `${outputs.join('\n')}\n`);

  let summary = summarizePlan(plan);
  if (alreadyPrepared) {
    summary = `PR #${prId} already contains a package-version preparation commit; no changes were made.`;
  } else if (prId && plan.packages.length === 0) {
    summary = `No packages changed since their latest release tags; PR #${prId} needs no version update.`;
  } else if (!prId && plan.packages.length === 0) {
    summary = 'No packages changed since their latest release tags; no version PR was created.';
  }
  if (stepSummary) await append(stepSummary, `${summary}\n`);
  return { plan, alreadyPrepared };
}

async function main() {
  const env = process.env;
  await createVersionPlan({
    bump: env.BUMP,
    prId: env.PR_ID,
    targetSha: env.TARGET_SHA,
    targetBaseSha: env.TARGET_BASE_SHA,
    plannerPath: env.RELEASE_PLANNER,
    planPath: env.RELEASE_PLAN_OUTPUT,
    githubOutput: env.GITHUB_OUTPUT,
    stepSummary: env.GITHUB_STEP_SUMMARY,
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
