import { execFileSync } from 'node:child_process';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packages = [
  { name: '@cssxio/compiler', directory: 'packages/compiler', dependencies: [] },
  { name: '@cssxio/babel-plugin', directory: 'packages/babel-plugin', dependencies: ['@cssxio/compiler'] },
  { name: '@cssxio/cssx', directory: 'packages/cssx', dependencies: [] },
  { name: '@cssxio/html', directory: 'packages/html', dependencies: ['@cssxio/compiler'] },
  {
    name: '@cssxio/react-native',
    directory: 'packages/react-native',
    dependencies: ['@cssxio/compiler'],
  },
  {
    name: '@cssxio/unplugin',
    directory: 'packages/unplugin',
    dependencies: ['@cssxio/babel-plugin', '@cssxio/compiler'],
  },
];
const packageByName = new Map(packages.map((packageInfo) => [packageInfo.name, packageInfo]));

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...argumentList] = process.argv.slice(2);
  const options = parseArguments(argumentList);

  if (command === 'plan') {
    await createPlan(options);
  } else if (command === 'apply') {
    await applyPlan(options);
  } else {
    fail(
      'Usage: node scripts/release-plan.mjs <plan|apply> [--base <ref>] [--bump <major|minor|patch>] --output <path>',
    );
  }
}

async function createPlan({ base, bump, output }) {
  if (!base || !bump || !output) fail('The plan command requires --base, --bump, and --output.');
  assertBump(bump);

  const changedFiles = git(['diff', '--name-only', `${base}...HEAD`, '--', 'packages'])
    .split('\n')
    .filter(Boolean);
  const selectedPackages = await Promise.all(
    selectReleasePackages(changedFiles).map((packageInfo) => planPackage(packageInfo, bump)),
  );
  const plan = { base, bump, packages: selectedPackages };
  await writeFile(output, `${JSON.stringify(plan, null, 2)}\n`);
  await writeGitHubOutput('has-release', String(selectedPackages.length > 0));
  await writeGitHubOutput('release-count', String(selectedPackages.length));
}

async function planPackage(packageInfo, bump) {
  const manifestPath = resolve(workspaceRoot, packageInfo.directory, 'package.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.name !== packageInfo.name) fail(`Expected ${manifestPath} to name ${packageInfo.name}.`);
  if (manifest.private) fail(`${packageInfo.name} is private and cannot be released.`);

  const version = manifest.version;
  if (typeof version !== 'string') fail(`${packageInfo.name} does not declare a version.`);

  const nextVersion = incrementVersion(version, bump);
  return { ...packageInfo, version, nextVersion, tag: `${packageInfo.name}@${nextVersion}` };
}

async function applyPlan({ input }) {
  if (!input) fail('The apply command requires --input.');
  const plan = JSON.parse(await readFile(input, 'utf8'));
  if (!Array.isArray(plan.packages)) fail('Release plan has no packages array.');
  assertBump(plan.bump);

  for (const releasePackage of plan.packages) {
    const packageInfo = packageByName.get(releasePackage.name);
    if (!packageInfo || packageInfo.directory !== releasePackage.directory) {
      fail(`Release plan includes an unknown package: ${releasePackage.name}`);
    }

    const manifestPath = resolve(workspaceRoot, packageInfo.directory, 'package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (manifest.version !== releasePackage.version) {
      fail(`${releasePackage.name} changed from planned version ${releasePackage.version}.`);
    }
    if (incrementVersion(manifest.version, plan.bump) !== releasePackage.nextVersion) {
      fail(`${releasePackage.name} has an invalid planned next version.`);
    }

    manifest.version = releasePackage.nextVersion;
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}

export function selectReleasePackages(changedFiles) {
  const selectedNames = new Set(
    packages
      .filter((packageInfo) => changedFiles.some((file) => file.startsWith(`${packageInfo.directory}/`)))
      .map((packageInfo) => packageInfo.name),
  );

  let addedDependency;
  do {
    addedDependency = false;
    for (const packageInfo of packages) {
      if (
        !selectedNames.has(packageInfo.name) &&
        packageInfo.dependencies.some((dependency) => selectedNames.has(dependency))
      ) {
        selectedNames.add(packageInfo.name);
        addedDependency = true;
      }
    }
  } while (addedDependency);

  return packages.filter((packageInfo) => selectedNames.has(packageInfo.name));
}

export function incrementVersion(version, bump) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) fail(`Version ${version} must use stable MAJOR.MINOR.PATCH format.`);
  assertBump(bump);

  const [, major, minor, patch] = match.map(Number);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function assertBump(bump) {
  if (!['major', 'minor', 'patch'].includes(bump)) fail(`Unsupported bump type: ${bump}`);
}

function git(args) {
  return execFileSync('git', args, { cwd: workspaceRoot, encoding: 'utf8' });
}

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (!option?.startsWith('--') || !value || options[option.slice(2)] !== undefined) {
      fail(`Invalid argument: ${option ?? ''}`);
    }
    options[option.slice(2)] = value;
  }
  return options;
}

async function writeGitHubOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function fail(message) {
  throw new Error(message);
}
