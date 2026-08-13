# ADR-0006: Use possession tokens for Guests

- Status: Proposed
- Date: 2026-08-12

## Context

Requiring every Guest to create an account would add friction and collect unnecessary identity data. A public short code alone is easy to observe or guess and must not authorize leaving or reading a private Pass. Guests still need to recover their Pass across refreshes on the same device.

## Decision

Authenticate Guest Pass actions with a high-entropy possession token issued once when the Pass is created.

- Return the raw token only to the joining Guest over HTTPS and store it in a secure, same-site, HTTP-only cookie when the deployment supports that flow.
- Store only a one-way digest of the token in the database.
- Never place the raw token in a URL, analytics event, server log, or public short code.
- Scope the credential to one Pass and allow it only to read or leave that Pass; it grants no Operator capability.
- Use a separate, non-secret short public code so a Guest and Operator can verbally identify a called Pass.
- Apply rate limits to join and token-verification attempts.
- Clear or expire the client credential after terminal resolution and the retention window.

Operator identity uses the deployment’s supported authenticated account mechanism and Venue-scoped authorization. Operator authorization must be checked server-side for every mutation.

## Consequences

- Guests can join quickly without disclosing personal identity.
- Possession of the device credential grants control of the Pass, so token handling is security-sensitive.
- Recovery on a different device is not guaranteed in the first release.
- Shared devices need an explicit leave/forget experience.

## Alternatives considered

- **Mandatory guest accounts:** rejected for the first release because they add friction and personal-data obligations.
- **Public short code as credential:** rejected because recognizable codes cannot also be sufficiently secret.
- **Phone-number verification:** rejected because it adds cost, delivery failure modes, and unnecessary personal data.
