# 0001. Coordinate-aware token placement via the MCP bridge

- Status: Accepted
- Date: 2026-08-18

## Context

The connected model needs to place tokens on an active Foundry scene using explicit scene coordinates rather than only randomized or grid-based placement. The scene is not just a background image; its map dimensions and grid metadata determine where a token can safely be placed.

Before this decision, the bridge exposed generic placement methods but did not reliably surface the coordinate context needed for a model to choose valid x/y positions. A model could not safely answer: "Where is the valid placement area?" or "What map coordinates should I use for this token?" without reading scene metadata first.

## Decision

We will expose a coordinate-based placement path through the MCP bridge and document the required scene metadata flow:

1. Call `get-current-scene` before token placement to read the scene dimensions and grid metadata.
2. Use the scene payload's `dimensions` and `coordinates`/`grid` fields to choose valid x/y positions within the map bounds.
3. Submit explicit coordinates via the existing Foundry placement flow using `placement: "coordinates"` and a coordinates array.
4. Reuse the native Foundry token-placement logic rather than creating a separate ad hoc placement system.

The `get-current-scene` response includes:

- scene width/height
- grid size, type, distance, and units
- origin and bounds metadata
- the current token layout for context

The bridge then forwards coordinates to the Foundry module using `foundry-mcp-bridge.addActorsToScene` with the token placement payload, preserving the explicit x/y values through validation and placement.

## Consequences

### Positive

- A connected model can place tokens at explicit coordinates instead of relying on random placement.
- Scene metadata is explicit and model-friendly, making map placement decisions safer and more deterministic.
- The feature integrates with Foundry's native scene semantics instead of introducing a second placement engine.
- Multi-token placement can use a matching coordinates array for each actor in the same scene.

### Negative

- Tool callers must read scene metadata before choosing x/y positions.
- Coordinate placement is only valid when the selected scene exposes usable bounds and grid data.
- Mis-sized coordinates can still produce invalid placements if the caller ignores the map dimensions.

## Related implementation

This ADR is reflected in the scene and token tools used by the MCP bridge:

- `packages/mcp-server/src/tools/scene.ts`
- `packages/mcp-server/src/tools/token-manipulation.ts`
- `packages/foundry-module/src/queries.ts`
- `packages/foundry-module/src/data-access.ts`
