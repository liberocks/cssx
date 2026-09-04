export type ReleaseBump = 'major' | 'minor' | 'patch';

export type ReleasePackage = {
  readonly name: string;
  readonly directory: string;
  readonly dependencies: readonly string[];
};

export type ReleaseManifest = {
  readonly version: string;
  readonly dependencies?: Readonly<Record<string, string>>;
};

export type PlannedReleasePackage = ReleasePackage & {
  readonly bump: ReleaseBump;
  readonly version: string;
  readonly nextVersion: string;
  readonly tag: string;
};

export const releasePackages: readonly ReleasePackage[];
export function createAutoReleasePlan(
  packageInfos: readonly ReleasePackage[],
  manifests: ReadonlyMap<string, ReleaseManifest>,
  changedPackageNames: ReadonlySet<string>,
  bump: ReleaseBump,
): readonly PlannedReleasePackage[];
export function incrementVersion(version: string, bump: ReleaseBump): string;
export function isVersionInRange(range: string | undefined, version: string): boolean;
