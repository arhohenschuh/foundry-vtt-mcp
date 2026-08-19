# BUG-0003. Downstream releases still target upstream identity

- Status: Resolved
- Severity: Release blocker
- Detected: 2026-08-19
- Resolved: 2026-08-19
- Affected surface: versions, release assets, update channel, Foundry package registry

## Symptom

The downstream repository is eight commits ahead of upstream but still advertises upstream's
`0.8.3` version and release coordinates. A downstream tag can therefore produce ambiguous version
provenance, point users to upstream assets, or attempt to update an upstream-owned registry entry.

The `dry_run_foundry` workflow input is declared but is not consumed by the registry update step,
so it currently cannot provide the protection its name promises.

## Root cause

The fork inherited release identity as static metadata:

- root package repository metadata points to `adambdooley/foundry-vtt-mcp`;
- `packages/foundry-module/module.json` uses upstream URL, changelog, manifest, and download links;
- README and workflow-generated release text contain upstream links;
- the release workflow can call the Foundry registry API without applying the dry-run input.

This was valid while the checkout was only an upstream contribution branch. It is unsafe once the
downstream line produces independently deployed behavior.

## Resolution

1. Selected `arhohenschuh/foundry-vtt-mcp` as the downstream release and update channel, with
   `adambdooley/foundry-vtt-mcp` retained explicitly as upstream.
2. Moved package metadata, module update URLs, installation links, runtime guidance, installer
   text, and generated release text to the downstream repository.
3. Replaced the workflow's inline `curl` with a tested publication client. Dry run renders the
   exact request without network access. Publication requires an enable variable, an exact
   authorized-repository variable, the matching GitHub repository, and a token.
4. Added a release identity gate that verifies metadata, local/CI repository identity, tag/version
   agreement, absence of upstream URLs on distributable surfaces, and upstream tag uniqueness.
5. Prepared the backward-compatible capability set as `0.9.0` across all ten manifest and
   lockfile version records.

## Regression evidence

- `npm run version:check`: all ten version records agreed on `0.9.0`.
- `npm run release:check`: downstream metadata and Git origin passed.
- `npm run release:check -- --check-upstream-tags`: `v0.9.0` did not exist upstream.
- `npm run test:release`: six registry-client and workflow-structure tests passed.
- `npm run typecheck`: all three workspaces passed.
- `npm test`: six release tests and 122 MCP server tests passed.
- `npm run audit:circular`: 93 files processed with no circular dependency.
- `npm run build:release`, MCP schema smoke, manifest validation, and installer staging passed for
  `v0.9.0`; the manifest reported zero errors and zero warnings.
- The workflow dry-run input now executes a dedicated non-writing job.
- The workflow contains no direct Foundry registry HTTP call.

Registry publication remains disabled unless the owner supplies the explicit repository variables
and secret documented in [`../releasing.md`](../releasing.md). This is an authority boundary, not
an unresolved defect.

## Architectural consequence

See [ADR 0005](../adr/0005-downstream-versioning-and-release-identity.md). Release identity and
registry authority are mandatory gates for downstream versioning.
