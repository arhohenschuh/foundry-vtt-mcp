# Downstream Release Procedure

The canonical release identity is defined in [`release.config.json`](../release.config.json).
Downstream releases are published from `arhohenschuh/foundry-vtt-mcp`; upstream
`adambdooley/foundry-vtt-mcp` remains the comparison source for version-collision checks.

## Prepare a version

Classify the public contract change according to
[ADR 0005](./adr/0005-downstream-versioning-and-release-identity.md), then update these records in
one commit:

- root `package.json` and `package-lock.json`;
- `packages/mcp-server/package.json`;
- `packages/foundry-module/package.json` and `module.json`;
- `shared/package.json`;
- `CHANGELOG.md`.

Run the release gates from the repository root:

```powershell
npm ci --workspaces --include-workspace-root
npm run version:check
npm run release:check
npm run release:check -- --check-upstream-tags
npm run typecheck
npm test
npm run audit:circular
```

`release:check` requires the local Git origin or `GITHUB_REPOSITORY` to match the configured
downstream repository. The upstream-tag check fails closed if it cannot prove that the version is
unused.

## Test the Foundry registry request

Run a local non-writing request render:

```powershell
node scripts/publish-foundry-release.mjs --dry-run --tag v0.9.0
```

The same path is available through `workflow_dispatch` by setting `dry_run_foundry=true`. Dry run
does not read a registry token or issue an HTTP request.

## Authorize registry publication

Tag releases always validate the registry payload. They publish it only when all of these GitHub
repository settings are present:

- variable `FOUNDRY_REGISTRY_PUBLISH_ENABLED` is exactly `true`;
- variable `FOUNDRY_REGISTRY_AUTHORIZED_REPOSITORY` is exactly
  `arhohenschuh/foundry-vtt-mcp`;
- secret `FOUNDRY_PACKAGE_RELEASE_TOKEN` is configured for an owner-authorized registry entry.

Missing or mismatched settings skip publication. The publication client repeats the authority
checks before making the request, so a workflow-condition regression cannot authorize a write by
itself.

## Tag the gated commit

After the branch checks pass, create an annotated tag that exactly matches the package version:

```powershell
git tag -a v0.9.0 -m "Release v0.9.0"
git push origin v0.9.0
```

The tag workflow rejects a tag/version mismatch and any version already present upstream. Do not
reuse or move a published release tag.
