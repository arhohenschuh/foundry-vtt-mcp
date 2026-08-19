# 0002. Resolve placed-token actions in token scope

- Status: Accepted
- Date: 2026-08-18

## Context

Foundry tokens can be linked to a world actor or can expose an unlinked synthetic actor with
token-specific data. Listing actions from `token.actor` but executing them through the canonical
world actor loses that document context. The action may then use the wrong embedded item, ignore
token overrides, resolve `self` incorrectly, or fail because a synthetic item does not exist on
the world actor.

Token identifiers are scene-scoped. The MCP tools currently operate on the active scene, so
discovery and execution must resolve the same token from the same scene.

## Decision

Placed-token operations will preserve token identity through the complete request path:

1. `get-token-actions` accepts a token ID and enumerates items from the active scene token's
   actor.
2. `use-token-action` accepts that same token ID and forwards it as the acting identifier.
3. The Foundry bridge resolves an active-scene token before falling back to a world actor for the
   generic `useItem` operation.
4. Item lookup, activity execution, resource consumption, and `self` targeting use the resolved
   token actor.
5. Operations against a non-active scene require a future explicit scene contract; they must not
   guess across scenes with matching token IDs.

World-actor identifiers remain valid for generic actor-level item use. Token-specific tools do
not convert a token ID to a world actor ID at the server boundary.

## Consequences

### Positive

- Unlinked synthetic actors execute the same actions that callers discover.
- Token overrides and token-scoped embedded items remain authoritative.
- Linked-token behavior remains compatible because the token actor resolves to its linked actor.
- The tool contract makes the acting document explicit and testable.

### Negative

- Token actions are coupled to the active scene until scene ID becomes an explicit tool input.
- Callers must discover and execute actions within a stable scene context.
- Generic item-use code must support both token-first and world-actor resolution.

## Alternatives considered

- **Always resolve the world actor:** rejected because it breaks unlinked tokens and discards
  token-specific state.
- **Copy synthetic items to the world actor before use:** rejected because it mutates canonical
  data and creates cleanup and provenance problems.
- **Search every scene for a token ID:** rejected because token IDs are not a global identity and
  ambiguous matches would execute against the wrong document.

## Related implementation

- `packages/mcp-server/src/tools/token-manipulation.ts`
- `packages/mcp-server/src/tools/token-manipulation.test.ts`
- `packages/foundry-module/src/data-access.ts`
- `packages/foundry-module/src/queries.ts`

## Related bug record

- [BUG-0001](../bugs/0001-placed-token-action-context-loss.md)
