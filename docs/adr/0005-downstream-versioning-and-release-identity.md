# 0005. Version the downstream bridge independently and protect release identity

- Status: Accepted
- Date: 2026-08-19

## Context

This downstream repository is based on `adambdooley/foundry-vtt-mcp`. At the time of this
decision, `git rev-list --left-right --count upstream/master...master` reported zero upstream-only
commits and eight downstream-only commits (`8270992..5314dd1`), while both lines still advertise
version `0.8.3`. The downstream changes add coordinate-aware placement, placed token action
discovery and execution, action-context safeguards, and a release quality gate.

Those are user-visible capabilities, not a patch-only repair. At the same time, module metadata,
documentation links, and parts of the release workflow still target the upstream repository.
Publishing a downstream tag without first resolving that identity could create a version
collision, direct users to the wrong assets, or attempt to update an upstream registry entry.

## Decision

The downstream line will use Semantic Versioning and treat its MCP tools, module settings,
transport topology, and supported runtime floors as public contracts:

- **Patch (`X.Y.Z+1`):** backward-compatible bug, security, documentation, build, or internal
  quality fixes with no new public tool or setting contract.
- **Minor (`X.Y+1.0`):** backward-compatible tools, systems, optional fields, settings with safe
  defaults, or other user-visible capabilities.
- **Major (`X+1.0.0`):** removed or renamed tools, incompatible input/output semantics, settings
  namespace or module-ID migration, incompatible transport/port changes, or a platform floor
  change that requires operator migration.

Although the project is below `1.0.0`, we will apply these compatibility rules strictly rather
than using `0.x` as permission for unannounced breakage. Release candidates use `-rc.N`; build
metadata is not used to distinguish two behaviorally different releases because it does not
change SemVer precedence.

The current unreleased downstream capability set is therefore a **`0.9.0` candidate**, not a
`0.8.4` patch and not yet a `1.0.0` stability commitment.

Before creating any downstream release tag:

1. Choose and verify the downstream release repository and update channel.
2. Remove or parameterize hardcoded upstream release URLs in module metadata and workflow text.
3. Prevent a downstream workflow from updating the upstream Foundry registry entry unless its
   owner explicitly authorizes that release.
4. Check upstream tags immediately before release and never reuse a version already published
   for the same module ID.
5. Bump all package manifests and `module.json` together, update `CHANGELOG.md`, pass
   `npm run version:check`, and create one annotated `vX.Y.Z` tag from the gated commit.

The existing `foundry-mcp-bridge` module ID is retained for local compatibility. Independent
public distribution under a new ID is a separate, breaking migration decision and must receive
its own ADR and settings/data migration plan.

## Implementation status

Implemented on 2026-08-19:

- downstream release identity is `arhohenschuh/foundry-vtt-mcp`;
- upstream remains `adambdooley/foundry-vtt-mcp` for provenance and collision checks;
- the current compatible feature set is prepared as `0.9.0`;
- release checks enforce repository identity, tag/version equality, distributable URLs, and
  upstream version uniqueness;
- Foundry registry dry run is non-writing and registry publication is disabled unless explicitly
  authorized for the exact downstream repository.

## Consequences

### Positive

- Operators can infer compatibility risk from the version number.
- Downstream capabilities cannot silently masquerade as upstream `0.8.3` in a release.
- Registry ownership and artifact provenance become release gates.
- The heavily used local Automation line can evolve without forcing an immediate module-ID
  migration.

### Negative

- Publishing to the Foundry registry requires explicit owner-managed repository variables and a
  token; a GitHub release alone does not imply registry publication.
- Retaining the upstream module ID requires active collision checks while both lines exist.
- Strict compatibility rules may cause `1.0.0` earlier than a permissive interpretation of
  pre-1.0 SemVer.
- Upstream merges do not determine the downstream bump automatically; the combined public
  contract change must be classified each time.

## Alternatives considered

- **Release the current changes as `0.8.4`:** rejected because multiple user-visible tools and
  placement capabilities were added.
- **Jump directly to `1.0.0`:** rejected because the current change set is backward-compatible
  and the project has not yet made a broader stability commitment.
- **Reuse upstream versions with build metadata:** rejected because SemVer ignores build metadata
  for precedence and update channels could treat the versions as equivalent.
- **Rename the module immediately:** rejected because local worlds and Automation scripts depend
  heavily on the current module ID; migration cost is not yet justified.

## Related implementation

- `package.json`
- `packages/mcp-server/package.json`
- `packages/foundry-module/package.json`
- `packages/foundry-module/module.json`
- `shared/package.json`
- `.github/workflows/build-complete-release.yml`
- `release.config.json`
- `scripts/check-release-identity.mjs`
- `scripts/publish-foundry-release.mjs`
- `scripts/publish-foundry-release.test.mjs`
- `scripts/check-version-consistency.mjs`
- `docs/releasing.md`

## Related bug record

- [BUG-0003](../bugs/0003-downstream-release-targets-upstream.md)
