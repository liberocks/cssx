## Required Verification

The `format`, `lint`, `coverage`, and `verify` checks run `pnpm format:check`, `pnpm lint`, `pnpm test:coverage`, `pnpm test:release`, and `pnpm benchmark` from the workspace root. They are required for every PR targeting `main`.

## 0.2 ABI Migration

The 0.2 compiler and runtime must be upgraded together. Compiled styles now use
the `$$css: 2` composite-class ABI. The compiler package renamed the old packed
record APIs to `compileStyleRecords`, `compileStyleRecordMaps`,
`composeCompiledStyles`, and `mergeCompiledStyles`; their corresponding public
types now use `CompiledStyle` and `CompiledUtility` names.

## Branch Policy

`main` is the protected, production-ready trunk. All human-authored changes
enter it through a focused feature PR; direct pushes are blocked. Require the
`format`, `lint`, `coverage`, and `verify` checks, and allow squash merges.
Only the release App may bypass the branch rules, and only when merging the
release workflow's deterministic version-bump PR. It cannot push directly to
`main`.

Every internal feature PR receives a separately named Cloudflare Worker preview
for the documentation site. The deployment URL appears in the workflow summary
and GitHub Deployments view. Pull requests from forks still receive CI, but do
not receive a preview because repository secrets are intentionally unavailable
to them. Closing an internal PR deletes its dedicated preview Worker.

The deployment workflow requires `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` repository secrets. The token needs permission to edit
Workers in the account. `main` deploys the configured `cssx-docs` Worker;
previews use `cssx-docs-pr-<PR number>` and therefore cannot overwrite
production.

### One-time migration

1. Stop merging feature PRs into `next`.
2. Create an annotated baseline checkpoint at the current `main` commit, after
   confirming that its package versions match npm:

   ```sh
   git fetch origin
   git tag --annotate release-baseline origin/main --message 'Release baseline'
   git push origin release-baseline
   ```

3. Merge the existing `next` work to `main` through one final reviewed PR.
4. Update branch protection so feature PRs target `main`, then delete `next`
   after that PR has merged and no open PR still targets it.

## Publication

Configure npm trusted publishing for every public package using repository
`liberocks/cssx` and workflow file `npm-release.yml`; do not configure an npm
environment. The release job uses Node 24, which provides the npm CLI version
required for OIDC trusted publishing; it does not read an npm token.

Run the **npm-release** workflow manually from `main`, select exactly one
package, then choose `patch`, `minor`, or `major`. The supported npm packages
are `@cssxio/compiler`, `@cssxio/babel-plugin`, `@cssxio/cssx`, `@cssxio/html`,
`@cssxio/react-native`, and `@cssxio/unplugin`. `cssx-intellisense` is
published separately to the VS Code Marketplace and must not be sent to npm.

The workflow verifies `main`, opens a deterministic version-bump PR for the
selected package, then merges it with the release App's PR-only bypass. Only
then does it verify the merged commit, build and publish that package with
provenance, and create its annotated tag such as `@cssxio/compiler@0.2.1`.

If npm publication fails after the version bump has merged, correct the trusted
publisher configuration and rerun **npm-release** with **retry existing
version** enabled for that same package. This validates `main` and only
publishes its current version if npm does not already contain it and its tag
does not exist. It does not create another bump PR; the selected bump is
ignored in this guarded recovery mode. If publication succeeded but tagging or
the GitHub Release failed, the same retry instead skips republishing and
finishes the missing tag and release. It also safely skips a tag or GitHub
Release that already exists.

Release notes include the first-parent commits merged since the previous tag
for that package. A package's first automated release uses `release-baseline`
when that tag is available.
