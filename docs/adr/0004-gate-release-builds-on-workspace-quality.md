# 0004. Gate release builds on deterministic workspace quality checks

- Status: Accepted
- Date: 2026-08-19

## Context

The repository produces Windows, macOS, standalone-server, and Foundry-module artifacts from one
npm workspace. A release can appear to build while package versions drift, shared declarations
are missing, tests remain in watch mode, or circular dependencies enter a runtime boundary.
Running checks informally before a tag does not make them a release invariant.

## Decision

The complete-release workflow will run one `quality` job before either platform build:

1. Install the workspace from the lockfile with
   `npm ci --workspaces --include-workspace-root`.
2. Require all version-bearing manifests to agree.
3. Build the shared package before workspace typechecking so package consumers resolve emitted
   declarations in a clean checkout.
4. Run tests once in non-watch mode.
5. reject circular dependencies across server, module, and shared source.
6. Make Windows and macOS build jobs depend on the successful quality job.

The gate validates source and release inputs. It does not deploy ignored local `dist` artifacts,
restart the singleton backend, or prove a live Foundry bridge connection.

## Consequences

### Positive

- Every release build starts from the same lockfile-backed dependency graph.
- Cross-workspace type contracts fail before expensive installers are built.
- Tests cannot leave CI waiting in watch mode.
- Platform artifacts share one minimum quality result.

### Negative

- Release latency increases by one dependency install and the quality checks.
- A quality-infrastructure failure blocks both platform builds.
- The workflow currently gates its configured pull-request, tag, branch, and manual events; it
  does not imply that every direct push to every branch runs CI.
- Live local Automation still requires an explicit build, deployment, restart, and identity
  check.

## Alternatives considered

- **Repeat all checks independently in each platform job:** rejected because it duplicates work
  and can produce inconsistent evidence.
- **Run checks only on pull requests:** rejected because tags and manual releases must defend
  themselves.
- **Treat a successful compile as sufficient:** rejected because version drift, behavior, and
  dependency cycles are separate failure classes.

## Related implementation

- `.github/workflows/build-complete-release.yml`
- `package.json`
- `packages/mcp-server/package.json`
- `scripts/check-version-consistency.mjs`

## Related bug record

- [BUG-0002](../bugs/0002-stale-local-runtime-after-source-update.md) documents the
  host-specific refresh procedure that remains outside this CI decision.
