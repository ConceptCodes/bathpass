# ADR-0005: Use polling for first-release status updates

- Status: Accepted
- Date: 2026-08-12

## Context

Guests and Operators need timely status changes, but correctness comes from server state rather than transport immediacy. WebSockets or a pub/sub provider would add connection lifecycle, fan-out, authentication, and deployment concerns before usage patterns are known.

## Decision

Use ordinary authenticated queries with adaptive polling for the first release.

- A waiting or called Pass page polls roughly every 3–5 seconds while visible.
- The Operator dashboard polls roughly every 2–3 seconds while visible.
- Inactive tabs slow or pause polling and refresh immediately when visible again.
- Responses include a version or update timestamp so unchanged responses are cheap and stale client writes can be rejected.
- After a successful command, the caller updates or invalidates its local view immediately rather than waiting for the next interval.

Polling is a delivery mechanism only. Expiration and transition decisions use server time and the persisted state. The query interface should allow a future server-sent-events or WebSocket adapter without changing Queue rules.

## Consequences

- The first release works on ordinary HTTP infrastructure and is easier to operate.
- Status may lag by a few seconds.
- Query handlers and indexes must tolerate repeated reads.
- Real usage can establish whether a push transport is worth its operational cost.

## Alternatives considered

- **WebSockets:** deferred until scale or latency evidence justifies persistent connections.
- **Server-sent events:** a plausible later adapter, but still adds connection and deployment constraints.
- **Manual refresh:** rejected because called status is time-sensitive and easy to miss.
