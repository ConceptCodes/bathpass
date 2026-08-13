# ADR-0003: Persist Queue state in PostgreSQL

- Status: Proposed
- Date: 2026-08-12

## Context

Queue state is currently stored in process memory. It disappears on restart, differs between application instances, and cannot make a “call next” operation atomic. BathPass needs relational constraints, transactions, migrations, and short operational queries. The deployment provider is not yet documented.

## Decision

Use a managed PostgreSQL database as the production system of record for Venues, Bathrooms, Passes, Operators, and Events.

All Queue mutations run inside server-side database transactions. “Call next” must lock or atomically claim the earliest waiting Pass and enforce at most one called Pass per Bathroom. Add database constraints for invariants that PostgreSQL can express, including identifier uniqueness and valid status-related timestamps. Application validation remains responsible for clear domain errors.

Use checked-in, forward-only migrations and repeatable seed data for local development. Choose the TypeScript database library during implementation based on compatibility with the selected host; that library choice does not require an ADR unless it changes the domain interface or deployment model.

Tests may use a disposable PostgreSQL database. A pure in-memory adapter is appropriate for fast transition tests only if it preserves the same observable Queue interface and invariants.

## Consequences

- Queue state survives restarts and is shared across instances.
- Transactions and constraints protect concurrency-sensitive invariants.
- Development and CI require a PostgreSQL instance or disposable test database.
- Database migrations become part of every schema change and deployment.
- The deployment must provide connection pooling appropriate to its runtime.

## Alternatives considered

- **In-process memory:** rejected because it is neither durable nor shared.
- **Browser storage:** rejected because it is guest-controlled and cannot coordinate Operators.
- **SQLite:** viable for a single long-running host, but rejected as the default because common serverless/multi-instance deployments need shared storage.
- **Event sourcing:** rejected for the first release because Events are useful for audit and metrics but rebuilding all state from them adds unnecessary complexity.
