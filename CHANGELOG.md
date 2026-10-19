# Changelog

All notable changes to Drishti. Milestones follow `docs/14-SETUP-RUNBOOK.md` §8.

## [Unreleased]

### M0 · Repo and scaffold (2026-10-19)

- Public GitHub repo `drishti` with the specification pack committed: `docs/`, `sample-data/`, `design/`, `brand/`, `PreQL-Drishti-SPEC.md`.
- pnpm 9 monorepo per runbook §4: `apps/web` (React 18 + Vite shell), `apps/worker` (Hono stub), `apps/sync` (CLI stubs), `apps/extension` (stub), `packages/engine`, `packages/shared` (copy deck from docs/09 §10 with `t()`), `e2e/`, `scripts/`.
- Tooling: TypeScript 6 (strict), ESLint 10 flat config with typescript-eslint, Prettier, Vitest 4 projects.
- Pre-commit hook (`simple-git-hooks`) and CI file check block files over 10 MB and names matching `*.secret*`, `*.pem`, `*sa*.json`.
- `ci.yml`: install, file check, lint, typecheck, tests, build; gitleaks job.
