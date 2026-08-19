# BUG-0001. Placed-token actions lost synthetic actor context

- Status: Resolved
- Severity: High
- Detected: 2026-08-18
- Resolved: 2026-08-18
- Affected surface: `get-token-actions`, `use-token-action`, and Foundry item execution

## Symptom

The bridge could discover actions from a placed token but fail to execute the selected action or
execute it against the wrong actor state. Unlinked tokens were most exposed because their
synthetic actors and embedded items can differ from the canonical world actor.

## Root cause

Action discovery and action execution did not preserve the same document identity end to end.
The server or bridge could cross from token scope into world-actor scope, losing the active-scene
token actor and its embedded item context. Scene resolution also had to remain consistent between
discovery and execution because token IDs are scene-scoped.

## Resolution

- Added `get-token-actions` and `use-token-action` as token-ID contracts.
- Forwarded the token ID as the acting identifier instead of replacing it with a world actor ID.
- Resolved the active-scene token before the generic world-actor fallback.
- Preserved token actor context for item lookup, activity execution, resource use, and targets.
- Aligned action discovery and execution on the same active-scene semantics.

Implemented by commits `a00380f`, `8811364`, and `9852289`.

## Regression evidence

- `packages/mcp-server/src/tools/token-manipulation.test.ts`
- `npm run typecheck`
- `npm test`: 8 files and 122 tests passed on 2026-08-19
- `npm run audit:circular`: no cycles found on 2026-08-19

## Architectural consequence

See [ADR 0002](../adr/0002-token-scoped-action-resolution.md). Token-specific tools preserve
token identity; they do not silently collapse it into world-actor identity.
