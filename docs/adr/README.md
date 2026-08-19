# Architecture Decision Records

This directory captures design decisions for the Foundry MCP integration.

Verified defects, root causes, and regression evidence belong in
[`../bugs`](../bugs/README.md). ADRs record only the durable constraints chosen in response.

## Accepted ADRs

- [0001-coordinate-aware-token-placement.md](./0001-coordinate-aware-token-placement.md) — Coordinate-aware token placement via the MCP bridge
- [0002-token-scoped-action-resolution.md](./0002-token-scoped-action-resolution.md) - Resolve placed-token actions in token scope
- [0003-singleton-backend-behind-stdio-wrappers.md](./0003-singleton-backend-behind-stdio-wrappers.md) - Use a singleton backend behind thin stdio wrappers
- [0004-gate-release-builds-on-workspace-quality.md](./0004-gate-release-builds-on-workspace-quality.md) - Gate release builds on deterministic workspace quality checks
- [0005-downstream-versioning-and-release-identity.md](./0005-downstream-versioning-and-release-identity.md) - Version the downstream bridge independently and protect release identity
