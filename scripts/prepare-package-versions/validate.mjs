import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function validatePlan(plan, { checkNpmVersion, checkVscodeVersion, checkTag }) {
  if (!Array.isArray(plan?.packages)) throw new Error('Release plan has no packages array.');
  for (const packageInfo of plan.packages) {
    const registry = packageInfo.registry ?? 'npm';
    let published;
    if (registry === 'npm') {
      published = await checkNpmVersion(packageInfo.name, packageInfo.nextVersion);
    } else if (registry === 'vscode') {
      const { publisher, name } = JSON.parse(await readFile(`${packageInfo.directory}/package.json`, 'utf8'));
      published = await checkVscodeVersion(`${publisher}.${name}`, packageInfo.nextVersion);
    } else {
      throw new Error(`Unknown release registry ${registry} for ${packageInfo.name}`);
    }
    if (published)
      throw new Error(`${packageInfo.name}@${packageInfo.nextVersion} is already published to ${registry}.`);
    if (await checkTag(packageInfo.tag)) throw new Error(`Release tag ${packageInfo.tag} already exists.`);
  }
}

export async function checkNpmVersion(packageName, version, fetchImpl = fetch) {
  const packagePath = encodeURIComponent(packageName).replaceAll('%2F', '%2f');
  const response = await fetchImpl(`https://registry.npmjs.org/${packagePath}`);
  if (response.status === 404) return false;
  if (response.status !== 200) throw new Error(`npm returned HTTP ${response.status} while querying ${packageName}`);
  const metadata = await response.json();
  if (!metadata || typeof metadata !== 'object' || !metadata.versions || typeof metadata.versions !== 'object') {
    throw new Error(`Unexpected npm version metadata for ${packageName}`);
  }
  return Object.hasOwn(metadata.versions, version);
}

export async function checkVscodeVersion(extensionId, version, execute = execFileAsync) {
  const { stdout } = await execute(
    'pnpm',
    ['dlx', '--allow-build=@vscode/vsce-sign', '@vscode/vsce@4.0.0', 'show', extensionId, '--json'],
    { maxBuffer: 8 * 1024 * 1024 },
  );
  if (stdout.trim() === 'undefined') return false;
  let metadata;
  try {
    metadata = JSON.parse(stdout);
  } catch {
    throw new Error(`Unexpected Visual Studio Marketplace metadata for ${extensionId}`);
  }
  if (!metadata || typeof metadata !== 'object' || !Array.isArray(metadata.versions)) {
    throw new Error(`Unexpected Visual Studio Marketplace metadata for ${extensionId}`);
  }
  return metadata.versions.some((entry) => entry?.version === version);
}

export async function checkTag(tag, execute = execFileAsync) {
  const { stdout } = await execute('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]);
  return stdout.trim().length > 0;
}

async function main() {
  const planPath = process.env.RELEASE_PLAN_INPUT;
  if (!planPath) throw new Error('RELEASE_PLAN_INPUT is required.');
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  await validatePlan(plan, {
    checkNpmVersion: (name, version) => checkNpmVersion(name, version),
    checkVscodeVersion: (name, version) => checkVscodeVersion(name, version),
    checkTag,
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
