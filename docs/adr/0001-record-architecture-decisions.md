# ADR-0001: Record architecture decisions

- Status: Accepted
- Date: 2026-08-12

## Context

BathPass is beginning as a very small prototype, but Queue correctness, persistence, identity, authorization, and live updates create choices that affect many modules. Without a durable record, later coding agents must infer intent from incomplete code and may repeatedly reverse earlier work.

## Decision

Record decisions that are costly to reverse, affect multiple modules, or constrain future implementation in `docs/adr/`. Keep product language and behavioral invariants in `CONTEXT.md`.

Accepted ADRs are historical records. A later decision supersedes an accepted ADR rather than editing its conclusion in place. Corrections that do not alter a decision may be made directly.

## Consequences

- Future agents can distinguish deliberate constraints from accidental implementation details.
- Changes that contradict an ADR must explicitly supersede it.
- The team must maintain documentation alongside implementation.
- Small, local implementation choices do not require ADRs.

## Alternatives considered

- **Rely on source code and commit history:** rejected because neither explains tradeoffs or the intended product behavior.
- **Keep a single design document:** rejected because independent decisions become difficult to evolve and supersede.
