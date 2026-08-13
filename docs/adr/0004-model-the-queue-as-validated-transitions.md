# ADR-0004: Model the Queue as validated transitions

- Status: Accepted
- Date: 2026-08-12

## Context

The prototype exposes a third-party mutable `Queue<string>` directly. That interface allows callers to mutate ordering without domain validation and cannot represent Pass lifecycle, authorization, idempotency, or persistence failures. The most damaging bugs would occur when multiple handlers reproduce transition rules differently.

## Decision

Represent queue behavior as explicit commands and queries over BathPass domain types, not as a publicly mutable collection.

The Queue module must provide the leverage needed by guest and Operator callers while hiding ordering, locking, persistence, and Event creation. Its interface should cover behaviors such as:

- join a Bathroom;
- read a Pass using its possession credential;
- leave an active Pass;
- list an Operator’s Bathroom state;
- call the next Pass;
- complete or skip the called Pass; and
- open or close a Bathroom.

Exact TypeScript signatures may evolve, but callers must receive typed results or stable domain errors rather than database exceptions. Expected conflicts include `BATHROOM_CLOSED`, `ALREADY_IN_QUEUE`, `NOT_AT_FRONT`, `NO_WAITING_PASS`, `PASS_NOT_ACTIVE`, `CALLED_PASS_EXISTS`, `FORBIDDEN`, and `NOT_FOUND`.

Each command validates authorization and current state, writes the transition and its Event atomically, and is safe to retry. Query results are immutable projections and never expose persistence models or possession-token digests.

## Consequences

- Ordering and lifecycle rules gain locality inside one deep module.
- Tests exercise the same interface used by handlers rather than a third-party collection.
- Presentation code becomes simpler and cannot mutate Queue state directly.
- The implementation must translate persistence conflicts into stable domain errors.
- `services/BathPass.ts` and the duplicate `Bathroom` interfaces should be removed once callers migrate.

## Alternatives considered

- **Expose a queue data structure:** rejected because its shallow interface leaks mutation while omitting the product rules.
- **Put rules in page/route handlers:** rejected because behavior would be duplicated across guest and Operator callers.
- **Use stored procedures as the public domain interface:** rejected because authorization and presentation integration are clearer in typed application code, while transactions can still use targeted SQL.
