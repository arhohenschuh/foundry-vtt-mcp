# 0003. Use a singleton backend behind thin stdio wrappers

- Status: Accepted
- Date: 2025-09-09 (documented retroactively 2026-08-19)

## Context

MCP hosts can start more than one stdio server process, while the Foundry bridge expects one
stable local backend connection. Allowing every stdio process to own the Foundry WebSocket port
creates startup races, duplicate bridge connections, conflicting background services, and
unclear lifecycle ownership.

The installation must also work from a source checkout and from bundled installer artifacts.

## Decision

Each MCP host may own a thin stdio wrapper, but all wrappers proxy requests to one machine-local
backend:

1. Wrappers connect to a private control channel on `127.0.0.1:31414`.
2. If the control channel is absent, a wrapper starts `backend.js`, preferring
   `backend.bundle.cjs` in bundled environments.
3. The backend acquires `%TEMP%\foundry-mcp-backend.lock` and is the sole owner of the Foundry
   bridge listener on port `31415`.
4. Wrapper/backend messages use newline-delimited JSON request and response envelopes.
5. Wrapper diagnostics and backend diagnostics remain separate so startup and bridge failures
   can be isolated.

Ports `31414` and `31415` are distinct contracts: `31414` is private wrapper control;
`31415` is the configured Foundry module connection.

## Consequences

### Positive

- Multiple MCP wrappers share one Foundry connection without competing for ports.
- The backend can outlive an individual stdio request path and centralize long-lived state.
- Source and installer deployments use the same topology.
- Process ownership and recovery can be diagnosed by exact port and command line.

### Negative

- Local operation now has two Node process roles and a lock file to manage.
- A listening backend is not sufficient evidence that a Foundry client is connected.
- Stale locks or stale backend processes require targeted recovery.
- Control protocol changes must remain compatible with all wrappers on the machine during an
  update.

## Alternatives considered

- **One complete backend per stdio process:** rejected because duplicate hosts race for the
  Foundry listener and duplicate long-lived state.
- **Run only a manually managed daemon:** rejected because first-run setup becomes fragile and
  MCP hosts cannot self-start the service.
- **Expose the control channel beyond loopback:** rejected because it adds a network trust
  boundary without a current business need.

## Related implementation

- `packages/mcp-server/src/index.ts`
- `packages/mcp-server/src/backend.ts`
- `packages/mcp-server/src/config.ts`
