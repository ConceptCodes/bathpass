# BathPass Product and Domain Context

## Purpose

BathPass is a lightweight virtual waitlist for shared bathrooms at a school, event, workplace, or other venue. A guest joins a queue from their phone, can see their place without standing outside the bathroom, and is notified when it is their turn. A staff operator keeps the line moving and handles exceptions.

The initial release is intentionally narrower than a general reservation system. It coordinates short, same-day bathroom visits at one venue. It does not schedule future appointments, process payments, track bathroom activity across venues, or attempt to prove that a guest physically entered a bathroom.

This document is the source of truth for product language, behavior, and scope. Architecture decisions live in `docs/adr/`.

## Product outcome

BathPass should replace an informal physical line with a queue that is:

- easy to join without creating an account;
- fair and understandable to guests;
- quick for staff to operate;
- resilient to refreshes and multiple application instances; and
- privacy-conscious, collecting no information that the queue does not need.

## Users and roles

### Guest

A person waiting to use a Bathroom. A Guest can join one Queue at a time within a Venue, view their Pass, leave the Queue, and acknowledge when called. The first release uses an opaque possession token rather than a permanent Guest account.

### Operator

A trusted staff member responsible for one Venue. An Operator can view all active Queues, call the next Pass, complete or skip a called Pass, close or reopen a Bathroom, and inspect recent operational Events. Operator authentication is required.

### Administrator

A trusted person who configures a Venue and its Bathrooms and manages Operator access. Administrator capabilities may initially be provided through deployment configuration or a protected setup flow; a full administration console is not required for the first release.

## Domain glossary

Use these exact terms in code, tests, interface copy, and future documentation.

### Venue

The organization or physical site running BathPass. A Venue owns Bathrooms, Operators, Queues, and its operational settings. All records are scoped to exactly one Venue, even while the first deployment serves only one.

### Bathroom

A guest-visible destination at a Venue, such as “First Floor – A.” A Bathroom has a stable identifier, display name, optional location hint, and an availability state of `open` or `closed`.

### Queue

The ordered collection of active Passes for one Bathroom. A Bathroom has exactly one current Queue. The Queue ordering rule is first-in, first-out by server-assigned join time, except when an Operator explicitly skips or removes a Pass.

### Pass

A Guest’s temporary claim to a position in a Queue. A Pass contains no guest name. It has a public short code for recognition, a secret possession token for guest actions, timestamps, and one status:

- `waiting`: ordered in the Queue and waiting to be called;
- `called`: invited to use the Bathroom during a response window;
- `completed`: successfully finished by an Operator;
- `left`: voluntarily cancelled by the Guest;
- `skipped`: removed by an Operator or automatically after the response window expires.

`completed`, `left`, and `skipped` are terminal statuses. A Pass is active only while `waiting` or `called`.

### Response window

The Venue-configured amount of time a called Guest has to respond before the Pass may be skipped. The default is five minutes. Expiration must use server time.

### Event

An append-only record of an operational fact, such as a Pass joining, being called, leaving, completing, or being skipped, or a Bathroom opening or closing. Events support troubleshooting and basic operational metrics; they are not the primary source of current state in the first release.

## Core invariants

These rules must hold regardless of which page, server handler, or background process initiates a change:

1. A Guest possession token can control only its associated Pass.
2. A Guest may have at most one active Pass in a Venue.
3. A Pass belongs to exactly one Venue, Bathroom, and Queue and cannot move between Bathrooms. Switching requires leaving and joining again.
4. A closed Bathroom accepts no new Passes and cannot call another Pass. Existing Passes remain visible so an Operator can resolve them.
5. Only the earliest `waiting` Pass may be called. The call operation must be atomic so concurrent requests cannot call two Guests for one turn.
6. At most one Pass is `called` for a Bathroom at a time.
7. Queue position is computed from active Passes on the server; clients never submit or persist their own position.
8. Terminal Passes never return to an active status. Retrying the same command must not produce duplicate transitions or Events.
9. Public queue views reveal counts and estimated waits, not other Guests’ codes or tokens.
10. Every state-changing Operator action records the acting Operator and a corresponding Event.

## Primary journeys

### Guest joins and uses a queue

1. The Guest opens the Venue join page, typically from a QR code.
2. BathPass shows open Bathrooms, current waiting counts, and an estimate only when enough data exists.
3. The Guest selects a Bathroom and confirms joining.
4. The server creates a `waiting` Pass and returns its public code and secret possession token.
5. The application stores the token on that device and displays live status and position.
6. An Operator calls the Pass when it reaches the front.
7. The Guest sees a prominent called state. Notification delivery is helpful but is not the source of truth; the Pass page is.
8. The Operator marks the Pass `completed`, or `skipped` if the Guest does not respond.

### Guest leaves

A Guest with an active Pass can leave from the Pass page. Leaving is idempotent. The next Guest’s computed position updates without renumbering stored records.

### Operator runs a bathroom

1. The Operator signs in and opens the Venue dashboard.
2. The dashboard shows each Bathroom’s availability, called Pass, waiting count, and next Pass.
3. The Operator calls the next Pass, then completes or skips it.
4. The Operator may close a Bathroom to prevent new joins and later reopen it.

## First-release requirements

The first releasable version is complete when it provides:

- a mobile-first Venue page listing Bathrooms and availability;
- guest join, status, leave, and refresh-safe Pass recovery flows;
- an authenticated Operator dashboard for call, complete, skip, close, and reopen actions;
- persistent server-authoritative data shared across application instances;
- atomic enforcement of the core invariants;
- timely status updates through simple polling, with a documented upgrade path;
- accessible loading, empty, success, and error states;
- automated domain tests plus integration tests for guest and Operator journeys;
- structured server logs and a health/readiness check; and
- documented local setup, environment variables, database migration, test, and deployment commands.

## Explicitly out of scope for the first release

- native mobile applications;
- SMS, email, or push notifications;
- maps or indoor navigation;
- future reservations, appointments, payments, ratings, or reviews;
- collecting legal names, phone numbers, demographic data, or visit reasons;
- cross-Venue guest accounts or queue transfers;
- predictive wait times before enough completed visits exist;
- hardware occupancy sensors; and
- offline queue mutation or peer-to-peer synchronization.

## Quality attributes

### Correctness

Queue order and transitions matter more than animation or instantaneous updates. State changes must be validated and committed on the server in a transaction.

### Privacy

Collect the minimum data required to operate the queue. Possession tokens are credentials: store only a one-way digest server-side, transmit them over HTTPS, redact them from logs, and expire client access after the Pass is terminal and the retention period ends.

### Accessibility

All journeys must be usable by keyboard and screen reader, must not communicate status by color alone, and should target WCAG 2.2 AA. Called status should use text and appropriate live-region behavior.

### Reliability

Refreshing or opening another application instance must not lose queue state. Repeated commands and transient network retries must be safe. A failed optional notification must never change Queue state.

### Performance

Guest and Operator pages should become usable on an ordinary mobile connection within a few seconds. Queue reads should remain efficient for hundreds of active Passes per Venue; large-scale optimization is premature.

## Initial data model

This is a conceptual model, not an instruction to mirror every field directly into interface code.

- `Venue`: id, slug, name, response-window duration, timestamps
- `Bathroom`: id, venue id, name, location hint, availability state, timestamps
- `Pass`: id, venue id, bathroom id, public code, possession-token digest, status, joined/called/resolved timestamps, version
- `Operator`: id, venue id, authentication subject, display label, role, active flag
- `Event`: id, venue id, bathroom id, optional pass id, type, actor kind/id, metadata, occurred timestamp

Use opaque identifiers. Store all timestamps in UTC and format them in the Venue’s configured time zone at the presentation seam.

## Delivery sequence

Future coding agents should work in this order unless a newer ADR supersedes it:

1. Establish domain types, transitions, and invariant-focused tests.
2. Add the relational schema, migrations, seed data, and transactional Queue module.
3. Add guest command/query handlers and the mobile guest journeys.
4. Add Operator authentication, authorization, handlers, and dashboard.
5. Add polling, expiration handling, accessibility checks, observability, and end-to-end tests.
6. Add deployment documentation and production hardening.

Do not begin with notifications, real-time infrastructure, or visual polish before the Queue transitions are durable and tested.

## Assumptions requiring product-owner confirmation

The repository does not yet answer these questions. The defaults below allow implementation to proceed and should be changed here and in an ADR if the product owner chooses differently.

- Primary setting: a single school/event/workplace Venue rather than a public bathroom directory.
- Guest identity: anonymous possession token, not a permanent account.
- Fairness: strict FIFO with explicit Operator skip, not priority or appointment rules.
- Capacity: one called Guest per Bathroom at a time.
- Default response window: five minutes.
- Retention: terminal Passes and Events retained for 30 days, then deleted or irreversibly aggregated.
- Deployment: one region near the Venue, with a managed PostgreSQL database.

## Documentation maintenance

When behavior changes, update this file in the same change. Add an ADR when a decision is expensive to reverse, affects multiple modules, or constrains future implementation. Do not rewrite accepted ADR history; supersede it with a new ADR.
