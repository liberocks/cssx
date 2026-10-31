import { execFile } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export function resolveTarget({ prId = '', bump, repository, githubSha, runId, pullRequest }) {
  if (!['major', 'minor', 'patch'].includes(bump)) throw new Error(`Unsupported bump type: ${bump}`);
  if (!repository || !githubSha || !runId) throw new Error('Repository, GitHub SHA, and run ID are required.');

  if (!prId) {
    return {
      kind: 'main',
      sha: githubSha,
      baseSha: githubSha,
      branch: `versions/${bump}-${runId}`,
    };
  }

  if (!/^[1-9][0-9]*$/.test(prId)) throw new Error('pr_id must be a positive pull request number.');
  if (
    !pullRequest ||
    pullRequest.state !== 'open' ||
    pullRequest.base?.ref !== 'main' ||
    pullRequest.base?.repo?.full_name !== repository ||
    pullRequest.head?.repo?.full_name !== repository ||
    typeof pullRequest.head?.ref !== 'string' ||
    pullRequest.head.ref.length === 0 ||
    !/^[0-9a-f]{40}$/.test(pullRequest.head?.sha ?? '') ||
    !/^[0-9a-f]{40}$/.test(pullRequest.base?.sha ?? '')
  ) {
    throw new Error(`PR #${prId} must be open, target main, and come from this repository.`);
  }

  return {
    kind: 'pull-request',
    sha: pullRequest.head.sha,
    baseSha: pullRequest.base.sha,
    branch: pullRequest.head.ref,
  };
}

export async function writeTargetOutputs(target, outputPath) {
  if (!outputPath) throw new Error('GITHUB_OUTPUT is required.');
  const lines = [`kind=${target.kind}`, `sha=${target.sha}`, `base-sha=${target.baseSha}`, `branch=${target.branch}`];
  await appendFile(outputPath, `${lines.join('\n')}\n`);
}

async function main() {
  const { PR_ID = '', BUMP, GITHUB_REPOSITORY, GITHUB_SHA, GITHUB_RUN_ID, GITHUB_OUTPUT } = process.env;
  let pullRequest;
  if (PR_ID) {
    if (!/^[1-9][0-9]*$/.test(PR_ID)) throw new Error('pr_id must be a positive pull request number.');
    const { stdout } = await execFileAsync('gh', ['api', `repos/${GITHUB_REPOSITORY}/pulls/${PR_ID}`]);
    pullRequest = JSON.parse(stdout);
  }
  const target = resolveTarget({
    prId: PR_ID,
    bump: BUMP,
    repository: GITHUB_REPOSITORY,
    githubSha: GITHUB_SHA,
    runId: GITHUB_RUN_ID,
    pullRequest,
  });
  await writeTargetOutputs(target, GITHUB_OUTPUT);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
