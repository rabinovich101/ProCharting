# Verification Cleanup Plan

## Goal

Make the repository verification commands target the real source files and avoid stale generated outputs, without changing runtime behavior or product UI.

## Checklist

- [x] Add this approved cleanup plan.
- [x] Prevent root TypeScript from treating every generated file as root source.
- [x] Point ESLint at package TypeScript projects and the standalone test app TypeScript project.
- [x] Point root lint/typecheck scripts at the intended verification targets.
- [x] Document the verification tooling layout in ARCHITECTURE.md.
- [x] Run verification commands and capture the remaining real source issues.
- [x] Add a review summary.

## Review

Completed the approved verification cleanup without changing runtime behavior or UI.

- Root `typecheck` now runs package source checks through package-level tsconfigs and then the standalone Next test app check.
- Root `lint` now targets `packages/*/src` and `TEST/binance-chart-test/app`, avoiding generated outputs and package config files that are outside typed lint projects.
- Root `tsconfig.json` now has `files: []` and broader generated-output excludes so stale `dist` declarations are not treated as root source.
- `.eslintrc.json` now points typed linting at the package tsconfigs and the test app tsconfig.
- `ARCHITECTURE.md` now documents the verification tooling layout.

Verification results:

- `pnpm typecheck` runs the intended checks and now fails on real source errors, mainly in `packages/core/src/chart.ts`, `packages/core/src/workers/*`, and related core files.
- `pnpm typecheck:test` fails on `TEST/binance-chart-test/app/page.tsx:54` because `useRef<number>()` is called without an initial value.
- `pnpm lint` runs without typed-project parse errors and reports 306 existing lint problems across source files.
- `git diff --check` passes.
