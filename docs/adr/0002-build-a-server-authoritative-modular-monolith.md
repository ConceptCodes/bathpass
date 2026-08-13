# ADR-0002: Build a server-authoritative modular monolith

- Status: Accepted
- Date: 2026-08-12

## Context

The prototype is a Next.js application that constructs queues in browser-importable memory. Production Queue state must survive refreshes, deployments, and multiple application instances. The product is still small and does not justify independently deployed modules or distributed messaging.

## Decision

Build BathPass as one deployable Next.js application with server-rendered pages or route handlers for network entry points and a server-only application core.

Organize implementation around domain modules such as Venue, Bathroom, Queue, Pass, and Operator rather than around generic controller/repository folders. The Queue module owns its transition rules and persistence transaction. Presentation code may invoke the module but must not reproduce its ordering or status logic.

Keep browser-safe presentation types separate from server-only persistence and credential code. Do not import database clients, token digests, or Operator authorization implementation into client bundles.

Introduce a seam only when behavior genuinely varies or tests require an in-memory adapter alongside production infrastructure. Avoid pass-through modules that merely rename persistence calls.

The current Pages Router may remain during feature construction. Router migration is not a prerequisite for the first release and should occur only through a separate ADR with a measurable benefit.

## Consequences

- Queue behavior has strong locality and can be tested through one small interface.
- One deployment and one database transaction are sufficient for the initial product.
- Scaling individual modules independently is deferred.
- Care is required to prevent server-only imports from entering browser bundles.
- The existing `services/BathPass.ts` in-memory singleton must be replaced; it is not a valid persistence adapter.

## Alternatives considered

- **Client-managed queues:** rejected because clients cannot enforce ordering, authorization, or concurrency.
- **Microservices per domain concept:** rejected because distributed coordination would add failure modes without current scale evidence.
- **Immediate App Router rewrite:** rejected because routing style does not solve the core persistence or Queue-correctness risks.
