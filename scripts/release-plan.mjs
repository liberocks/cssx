import { execFile } from 'node:child_process';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const execFileAsync = promisify(execFile);

export const releasePackages = [
  {
    name: '@cssxio/compiler',
    directory: 'packages/compiler',
    excludedDirectories: ['packages/compiler/native'],
    dependencies: [],
    registry: 'npm',
  },
  {
    name: '@cssxio/formatter',
    directory: 'packages/formatter',
    dependencies: ['@cssxio/compiler', '@cssxio/compiler-native'],
    registry: 'npm',
  },
  {
    name: '@cssxio/compiler-native',
    directory: 'packages/compiler-native',
    sourceDirectories: ['packages/compiler/native'],
    dependencies: [],
    registry: 'npm',
  },
  {
    name: '@cssxio/babel-plugin',
    directory: 'packages/babel-plugin',
    dependencies: ['@cssxio/compiler'],
    registry: 'npm',
  },
  { name: '@cssxio/cssx', directory: 'packages/cssx', dependencies: [], registry: 'npm' },
  { name: '@cssxio/html', directory: 'packages/html', dependencies: ['@cssxio/compiler'], registry: 'npm' },
  {
    name: '@cssxio/react-native',
    directory: 'packages/react-native',
    dependencies: ['@cssxio/compiler'],
    registry: 'npm',
  },
  {
    name: '@cssxio/unplugin',
    directory: 'packages/unplugin',
    dependencies: ['@cssxio/babel-plugin', '@cssxio/compiler', '@cssxio/compiler-native'],
    registry: 'npm',
  },
  { name: 'cssx-intellisense', directory: 'packages/intellisense', dependencies: [], registry: 'vscode' },
];
const packageByName = new Map(releasePackages.map((packageInfo) => [packageInfo.name, packageInfo]));

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...argumentList] = process.argv.slice(2);
  const options = parseArguments(argumentList);

  if (command === 'plan') {
    await createPlan(options);
  } else if (command === 'apply') {
    await applyPlan(options);
  } else {
    fail(
      'Usage: node scripts/release-plan.mjs <plan|apply> --package <auto|release-package> --bump <major|minor|patch> --output <path>',
    );
  }
}

async function createPlan({
  bump,
  output,
  package: selectedPackageName,
  'retry-existing-version': retryExistingVersion,
}) {
  if (!bump || !output || !selectedPackageName) {
    fail('The plan command requires --package, --bump, and --output.');
  }
  assertBump(bump);
  const retry = parseBooleanOption(retryExistingVersion ?? 'false', 'retry-existing-version');
  const selectedPackages =
    selectedPackageName === 'auto'
      ? retry
        ? await planAutoRetryPackages(bump)
        : await planAutoPackages(bump)
      : [await planPackage(requirePackage(selectedPackageName), bump, retry)];
  const plan = {
    bump,
    mode: retry ? 'retry' : selectedPackageName === 'auto' ? 'auto' : 'version-bump',
    packages: selectedPackages,
  };
  await writeFile(output, `${JSON.stringify(plan, null, 2)}\n`);
  await writeGitHubOutput('has-release', String(selectedPackages.length > 0));
  await writeGitHubOutput('release-count', String(selectedPackages.length));
  await writeGitHubOutput('requires-version-bump', String(selectedPackages.length > 0 && !retry));
}

function requirePackage(packageName) {
  const packageInfo = packageByName.get(packageName);
  if (!packageInfo) fail(`Unknown release package: ${packageName}`);
  return packageInfo;
}

async function planPackage(packageInfo, bump, retry) {
  const manifest = await readPackageManifest(packageInfo);
  const version = manifest.version;
  const nextVersion = retry ? version : incrementVersion(version, bump);
  return { ...packageInfo, bump, version, nextVersion, tag: `${packageInfo.name}@${nextVersion}` };
}

async function planAutoPackages(bump) {
  const manifests = new Map(
    await Promise.all(
      releasePackages.map(async (packageInfo) => [packageInfo.name, await readPackageManifest(packageInfo)]),
    ),
  );
  const changedPackageNames = await findChangedPackageNames();
  return createAutoReleasePlan(releasePackages, manifests, changedPackageNames, bump);
}

async function planAutoRetryPackages(bump) {
  const manifests = new Map(
    await Promise.all(
      releasePackages.map(async (packageInfo) => [packageInfo.name, await readPackageManifest(packageInfo)]),
    ),
  );
  const changedPackageNames = await findChangedPackageNames();
  return createAutoRetryPlan(releasePackages, manifests, changedPackageNames, bump);
}

export function createAutoReleasePlan(packageInfos, manifests, changedPackageNames, bump) {
  assertBump(bump);
  const selectedPackageNames = new Set(changedPackageNames);

  for (const packageName of selectedPackageNames) requirePackage(packageName);

  let addedPackage = true;
  while (addedPackage) {
    addedPackage = false;
    for (const packageInfo of packageInfos) {
      if (selectedPackageNames.has(packageInfo.name)) continue;
      const manifest = manifests.get(packageInfo.name);
      if (!manifest) fail(`Could not find the manifest for ${packageInfo.name}.`);

      for (const dependency of packageInfo.dependencies) {
        if (!selectedPackageNames.has(dependency)) continue;
        const dependencyManifest = manifests.get(dependency);
        if (!dependencyManifest) fail(`Could not find the manifest for ${dependency}.`);
        const dependencyNextVersion = incrementVersion(
          dependencyManifest.version,
          changedPackageNames.has(dependency) ? bump : 'patch',
        );
        if (!isVersionInRange(dependencyRange(manifest, dependency), dependencyNextVersion)) {
          selectedPackageNames.add(packageInfo.name);
          addedPackage = true;
          break;
        }
      }
    }
  }

  return packageInfos
    .filter((packageInfo) => selectedPackageNames.has(packageInfo.name))
    .map((packageInfo) => {
      const manifest = manifests.get(packageInfo.name);
      if (!manifest) fail(`Could not find the manifest for ${packageInfo.name}.`);
      const packageBump = changedPackageNames.has(packageInfo.name) ? bump : 'patch';
      const nextVersion = incrementVersion(manifest.version, packageBump);
      return {
        ...packageInfo,
        bump: packageBump,
        version: manifest.version,
        nextVersion,
        tag: `${packageInfo.name}@${nextVersion}`,
      };
    });
}

export function createAutoRetryPlan(packageInfos, manifests, changedPackageNames, bump) {
  assertBump(bump);
  const selectedPackageNames = new Set(changedPackageNames);

  for (const packageName of selectedPackageNames) requirePackage(packageName);

  return packageInfos
    .filter((packageInfo) => selectedPackageNames.has(packageInfo.name))
    .map((packageInfo) => {
      const manifest = manifests.get(packageInfo.name);
      if (!manifest) fail(`Could not find the manifest for ${packageInfo.name}.`);
      return {
        ...packageInfo,
        bump,
        version: manifest.version,
        nextVersion: manifest.version,
        tag: `${packageInfo.name}@${manifest.version}`,
      };
    });
}

async function findChangedPackageNames() {
  const changedPackageNames = new Set();
  for (const packageInfo of releasePackages) {
    const baseRef = (await latestReleaseTag(packageInfo.name)) ?? (await releaseBaselineTag());
    if (!baseRef || (await packageChangedSince(packageInfo, baseRef))) {
      changedPackageNames.add(packageInfo.name);
    }
  }
  return changedPackageNames;
}

async function latestReleaseTag(packageName) {
  const { stdout } = await execFileAsync('git', ['tag', '--list', `${packageName}@*`, '--sort=-v:refname'], {
    cwd: workspaceRoot,
  });
  return stdout.split('\n').find(Boolean);
}

async function releaseBaselineTag() {
  try {
    await execFileAsync('git', ['rev-parse', '--verify', '--quiet', 'refs/tags/release-baseline'], {
      cwd: workspaceRoot,
    });
    return 'release-baseline';
  } catch {
    return undefined;
  }
}

async function pathChangedSince(baseRef, directory, excludedDirectories = []) {
  try {
    const pathspecs = [directory, ...excludedDirectories.map((excluded) => `:(exclude)${excluded}/**`)];
    await execFileAsync('git', ['diff', '--quiet', `${baseRef}..HEAD`, '--', ...pathspecs], { cwd: workspaceRoot });
    return false;
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 1) return true;
    throw error;
  }
}

/** Checks the package directory and any source directories used to build its release artifact. */
export async function packageChangedSince(packageInfo, baseRef, hasChangedPath = pathChangedSince) {
  for (const directory of [packageInfo.directory, ...(packageInfo.sourceDirectories ?? [])]) {
    const excludedDirectories = directory === packageInfo.directory ? (packageInfo.excludedDirectories ?? []) : [];
    const changed =
      excludedDirectories.length > 0
        ? await hasChangedPath(baseRef, directory, excludedDirectories)
        : await hasChangedPath(baseRef, directory);
    if (changed) return true;
  }
  return false;
}

async function readPackageManifest(packageInfo) {
  const manifestPath = resolve(workspaceRoot, packageInfo.directory, 'package.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.name !== packageInfo.name) fail(`Expected ${manifestPath} to name ${packageInfo.name}.`);
  if (manifest.private) fail(`${packageInfo.name} is private and cannot be released.`);
  if (typeof manifest.version !== 'string') fail(`${packageInfo.name} does not declare a version.`);
  return manifest;
}

async function applyPlan({ input }) {
  if (!input) fail('The apply command requires --input.');
  const plan = JSON.parse(await readFile(input, 'utf8'));
  if (!Array.isArray(plan.packages)) fail('Release plan has no packages array.');
  if (plan.mode !== 'version-bump' && plan.mode !== 'auto')
    fail('Only version-bump and auto release plans can be applied.');
  assertBump(plan.bump);

  const nextVersionByPackage = new Map(
    plan.packages.map((releasePackage) => [releasePackage.name, releasePackage.nextVersion]),
  );

  for (const releasePackage of plan.packages) {
    const packageInfo = packageByName.get(releasePackage.name);
    if (!packageInfo || packageInfo.directory !== releasePackage.directory) {
      fail(`Release plan includes an unknown package: ${releasePackage.name}`);
    }

    const manifest = await readPackageManifest(packageInfo);
    if (manifest.version !== releasePackage.version) {
      fail(`${releasePackage.name} changed from planned version ${releasePackage.version}.`);
    }
    if (incrementVersion(manifest.version, releasePackage.bump) !== releasePackage.nextVersion) {
      fail(`${releasePackage.name} has an invalid planned next version.`);
    }

    manifest.version = releasePackage.nextVersion;
    for (const dependency of packageInfo.dependencies) {
      const dependencyNextVersion = nextVersionByPackage.get(dependency);
      if (dependencyNextVersion && !isVersionInRange(dependencyRange(manifest, dependency), dependencyNextVersion)) {
        const section = manifest.dependencies?.[dependency] ? 'dependencies' : 'optionalDependencies';
        manifest[section] ??= {};
        manifest[section][dependency] = `^${dependencyNextVersion}`;
      }
    }
    const manifestPath = resolve(workspaceRoot, packageInfo.directory, 'package.json');
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  await updateDependencyVersions(plan.packages);
}

/** Updates published CSSX dependency ranges in released packages. */
async function updateDependencyVersions(releasePackages) {
  const releasedVersions = new Map(releasePackages.map((packageInfo) => [packageInfo.name, packageInfo.nextVersion]));
  const manifestPaths = releasePackages.map((packageInfo) =>
    resolve(workspaceRoot, packageInfo.directory, 'package.json'),
  );

  for (const manifestPath of manifestPaths) {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    let changed = false;
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      if (!manifest[section]) continue;
      for (const [name, version] of Object.entries(manifest[section])) {
        const nextVersion = releasedVersions.get(name);
        const nextRange = nextVersion && updateVersionRange(version, nextVersion);
        if (!nextRange || nextRange === version) continue;
        manifest[section][name] = nextRange;
        changed = true;
      }
    }
    if (changed) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}

function dependencyRange(manifest, dependency) {
  return manifest.dependencies?.[dependency] ?? manifest.optionalDependencies?.[dependency];
}

function updateVersionRange(version, nextVersion) {
  const match = /^(\^|~)?\d+\.\d+\.\d+$/.exec(version);
  return match ? `${match[1] ?? ''}${nextVersion}` : undefined;
}

export function isVersionInRange(range, version) {
  if (range === version) return true;
  const rangeMatch = /^(?:\^)(\d+)\.(\d+)\.(\d+)$/.exec(range ?? '');
  const versionMatch = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!rangeMatch || !versionMatch) return false;

  const [, rangeMajor, rangeMinor, rangePatch] = rangeMatch.map(Number);
  const [, versionMajor, versionMinor, versionPatch] = versionMatch.map(Number);
  const lowerBound = [rangeMajor, rangeMinor, rangePatch];
  const candidate = [versionMajor, versionMinor, versionPatch];
  if (compareVersionParts(candidate, lowerBound) < 0) return false;
  if (rangeMajor > 0) return versionMajor === rangeMajor;
  if (rangeMinor > 0) return versionMajor === 0 && versionMinor === rangeMinor;
  return versionMajor === 0 && versionMinor === 0 && versionPatch === rangePatch;
}

function compareVersionParts(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
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

function parseBooleanOption(value, name) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  fail(`--${name} must be true or false.`);
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
