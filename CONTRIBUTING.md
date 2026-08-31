# Contributing To CSSX

Thanks for contributing. Start a discussion or issue before substantial work so
the intended behavior and test coverage are clear.

## Development

Use Node 22 and the package-manager version declared in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm test:coverage
pnpm test:package-contract
pnpm typecheck
pnpm test:visual
pnpm benchmark
```

Coverage must remain at 100% for statements, branches, functions, and lines in
every covered source file. Add or update tests with every behavior change; do
not lower coverage thresholds or exclude production code to make a check pass.

Run `pnpm test:release` for the non-visual release gate. Run `pnpm test:visual`
when changing rendered output, compiler output, or framework integration.

## Pull Requests

Create a focused branch and open a PR to `next`; never push directly to `main`.
Keep commits small and logically scoped. Describe the user-visible change,
testing performed, and any benchmark impact in the PR.

All required CI checks must pass before merge. Do not commit generated build
output, local coverage data, or updated visual snapshots unless the rendered
output intentionally changed and the review explains why.

## Releases

Do not manually change versions for publication. Maintainers release `next`
through the manual Release workflow. See [RELEASE.md](RELEASE.md) for package
selection, trusted publication, and the automatic `next` to `main` merge.
