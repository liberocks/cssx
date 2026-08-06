# Release Review Record

## Source And Dependency Review

Review date: 2026-08-29

Scope: `packages/*/src`, all CSSX package manifests, and the root `pnpm-lock.yaml`.

Outcome: The CSSX packages use their declared dependencies only. The reviewed source contains no vendored implementation. Historical compatibility references are recorded in each published compiler package's `THIRD_PARTY_NOTICES.md`.

The package-contract test enforces that the prohibited utility packages are absent from package manifests and the resolved root dependency graph. Renew this review before a release whenever reviewed source or dependency declarations change.

## Required Verification

Run `pnpm test:release` from the workspace root. It builds packages, runs unit and package-contract tests, and type-checks the workspace.

## 0.2 ABI Migration

The 0.2 compiler and runtime must be upgraded together. Compiled styles now use
the `$$css: 2` composite-class ABI. The compiler package renamed the old packed
record APIs to `compileStyleRecords`, `compileStyleRecordMaps`,
