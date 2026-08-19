# BUG-0002. Local Automation ran stale generated artifacts after a source update

- Status: Resolved
- Severity: High
- Detected: 2026-08-19
- Resolved: 2026-08-19
- Affected surface: local stdio wrapper, singleton backend, installed Foundry bridge

## Symptom

The repository had been pulled to the latest source, but local Automation would still execute
older `dist/index.js`, `dist/backend.js`, and installed bridge output. Typechecking also failed to
resolve `@foundry-mcp/shared` even after the shared package was built.

## Root cause

Two independent local-state problems overlapped:

1. The npm workspace junction for `@foundry-mcp/shared` still targeted a sibling checkout rather
   than this repository.
2. Generated `dist` directories are intentionally ignored, so pulling TypeScript source does not
   rebuild the files launched by VS Code or copied into Foundry's module directory.

The source checkout, dependency links, server runtime, and installed module could therefore each
represent a different commit while reporting the same package version.

## Resolution

- Recreated workspace dependencies and verified the shared junction targets this checkout.
- Rebuilt the unbundled wrapper/backend and Foundry module from commit `5314dd1`.
- Backed up and replaced the installed bridge runtime.
- Required a file-for-file SHA-256 match for all 53 managed bridge files.
- Added a guarded local refresh helper and procedure to the platform Automation runbook. The
  helper refuses active listeners on ports `31414` and `31415`, runs the complete quality gate,
  deploys with rollback, and writes a JSON report.

## Regression evidence

- Workspace target: `G:\Make\GitDev\foundry-vtt-mcp\shared`
- `npm ci --workspaces --include-workspace-root`: passed
- `npm run version:check`: all five manifests agreed on `0.8.3`
- `npm run typecheck`: passed
- `npm test`: 8 files and 122 tests passed
- `npm run audit:circular`: no cycles found
- Local refresh report:
  `Automation/reports/foundry-mcp-local-update-20260819-070340.json`

## Architectural consequence

ADR 0004 explicitly separates source/release validation from local generated-artifact deployment.
The operational refresh remains in the platform Automation runbook because checkout and Foundry
data paths are host-specific.
