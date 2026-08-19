# Bug Records

This directory is the durable ledger for verified defects in the downstream Foundry MCP bridge.
Bug records capture symptoms, root causes, fixes, and regression evidence. Architecture Decision
Records in [`../adr`](../adr/README.md) capture the design constraints chosen because of those
findings.

Do not use an ADR as a substitute for a bug record. Link the two when a defect results in a
long-lived architectural decision.

## Status values

- **Open:** verified and not yet repaired.
- **Investigating:** reproduced, with root cause still being isolated.
- **Resolved:** repaired with fresh validation evidence.
- **Closed - not planned:** verified but intentionally not repaired, with rationale recorded.

## Records

- [0001-placed-token-action-context-loss.md](./0001-placed-token-action-context-loss.md) - Resolved: placed-token actions lost synthetic actor context
- [0002-stale-local-runtime-after-source-update.md](./0002-stale-local-runtime-after-source-update.md) - Resolved: local Automation ran stale generated artifacts
- [0003-downstream-release-targets-upstream.md](./0003-downstream-release-targets-upstream.md) - Open: downstream releases still target upstream identity
