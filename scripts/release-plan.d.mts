export type ReleaseBump = 'major' | 'minor' | 'patch';

export type ReleasePackage = {
  readonly name: string;
  readonly directory: string;
  readonly dependencies: readonly string[];
};

export function selectReleasePackages(changedFiles: readonly string[]): readonly ReleasePackage[];
export function incrementVersion(version: string, bump: ReleaseBump): string;
