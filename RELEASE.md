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
`format`, `lint`, `coverage`, and `verify` checks, and enable squash auto-merge.
Only the release workflow may bypass the branch rule to write its deterministic
version-bump commit.

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

Configure npm trusted publishing for every public package using this repository
and `.github/workflows/npm-release.yml`. The workflow uses its OIDC identity
and does not read an npm token.

Run the **npm-release** workflow manually from `main`, select exactly one
package, then choose `patch`, `minor`, or `major`. The supported npm packages
are `@cssxio/compiler`, `@cssxio/babel-plugin`, `@cssxio/cssx`, `@cssxio/html`,
`@cssxio/react-native`, and `@cssxio/unplugin`. `cssx-intellisense` is
published separately to the VS Code Marketplace and must not be sent to npm.

The workflow verifies `main`, opens a deterministic version-bump PR for the
selected package, waits for its protected checks, and merges it automatically.
Only then does it build and publish that package with provenance, create its
annotated tag such as `@cssxio/compiler@0.2.1`.
