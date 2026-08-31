## Required Verification

The `CI / coverage` and `CI / verify` checks run `pnpm test:coverage`, `pnpm test:release`, and `pnpm benchmark` from the workspace root. They are required for every PR targeting `next` or `main`.

## 0.2 ABI Migration

The 0.2 compiler and runtime must be upgraded together. Compiled styles now use
the `$$css: 2` composite-class ABI. The compiler package renamed the old packed
record APIs to `compileStyleRecords`, `compileStyleRecordMaps`,
`composeCompiledStyles`, and `mergeCompiledStyles`; their corresponding public
types now use `CompiledStyle` and `CompiledUtility` names.

## Branch Policy

Create `next` from `main`. All human-authored changes must enter `next` through
a PR, and `main` must accept changes only through a PR from `next`.

Configure repository rules so both branches require the `CI / coverage` and
`CI / verify` checks. Block direct pushes to `main`, enable auto-merge, and
allow workflows to create PRs. Give only the release workflow a bypass for
`next`: it writes the deterministic version-bump commit that must exist before
publication.

The initial migration must not push the local commits currently ahead of
`origin/main` to `main`. Put them on a feature branch and merge them through the
first PR to `next`.

## Publication

Configure npm trusted publishing for every public package using this repository
and `.github/workflows/release.yml`. The workflow uses its OIDC identity and
does not read an npm token.

Run the Release workflow manually and choose `patch`, `minor`, or `major`. It
compares `next` with `main`, selects public packages changed under `packages/*`,
and applies the selected bump uniformly. A compiler release also releases the
Babel plugin and bundler plugin; a Babel plugin release also releases the
bundler plugin, so packed internal dependencies remain valid.

The workflow first runs the complete verification suite. It then commits the
calculated versions to `next`, re-runs CI for that exact commit, publishes the
selected packages with provenance, and creates one annotated tag per package
such as `@cssxio/compiler@0.2.1`. It creates one GitHub Release listing every
published package, then creates or reuses the `next` to `main` PR and enables
squash auto-merge.

If no public package changed, publication, tags, and the GitHub Release are
skipped. The workflow still creates or reuses the `next` to `main` PR and
enables auto-merge after the required check succeeds.
