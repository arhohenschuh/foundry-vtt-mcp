# BUG-0003. Downstream releases still target upstream identity

- Status: Open
- Severity: Release blocker
- Detected: 2026-08-19
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

## Required resolution

1. Decide whether releases remain upstream contributions or use a separate downstream channel.
2. Parameterize repository URLs where GitHub context is available and set static module metadata
   to the selected owner.
3. Make registry publication opt-in for the authorized repository and make dry-run behavior
   executable and testable.
4. Add a release check that rejects upstream/fork identity mismatches and version reuse.
5. Prepare the current backward-compatible capability set as `0.9.0` only after those checks pass.

## Current containment

- Do not create or publish a downstream release tag.
- Local builds remain commit-pinned by the Automation refresh report.
- `npm run version:check` prevents internal manifest drift but does not prove repository identity.

## Architectural consequence

See [ADR 0005](../adr/0005-downstream-versioning-and-release-identity.md). Release identity and
registry authority are mandatory gates for downstream versioning.
