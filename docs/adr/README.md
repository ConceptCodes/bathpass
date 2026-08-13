# Architecture Decision Records

Architecture Decision Records (ADRs) explain durable choices and their tradeoffs. `CONTEXT.md` defines the product and domain; these records define how the implementation supports it.

## Status vocabulary

- **Proposed**: recommended, but awaiting explicit acceptance or implementation evidence.
- **Accepted**: the project has committed to the decision.
- **Superseded**: a newer ADR replaces the decision; retain the old record as history.

## Index

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-build-a-server-authoritative-modular-monolith.md) | Build a server-authoritative modular monolith | Accepted |
| [0003](0003-persist-queue-state-in-postgresql.md) | Persist Queue state in PostgreSQL | Proposed |
| [0004](0004-model-the-queue-as-validated-transitions.md) | Model the Queue as validated transitions | Accepted |
| [0005](0005-use-polling-for-first-release-status-updates.md) | Use polling for first-release status updates | Accepted |
| [0006](0006-use-possession-tokens-for-guests.md) | Use possession tokens for Guests | Proposed |

## Adding an ADR

Copy this shape and use the next four-digit number:

```md
# ADR-NNNN: Imperative decision title

- Status: Proposed
- Date: YYYY-MM-DD

## Context

Why a decision is needed and which forces matter.

## Decision

The chosen direction stated concretely.

## Consequences

What becomes easier, harder, or constrained.

## Alternatives considered

Viable options and why they were not chosen.
```
