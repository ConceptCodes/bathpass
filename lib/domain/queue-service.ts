import { eq, and, asc, desc, sql, inArray } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import {
  PassDomain,
  PublicVenueSummary,
  PublicPassView,
  OperatorDashboardView,
} from '@/lib/domain/types';
import {
  BathroomClosedError,
  AlreadyInQueueError,
  NoWaitingPassError,
  PassNotActiveError,
  CalledPassExistsError,
  NotFoundError,
} from '@/lib/domain/errors';
import {
  hashPossessionToken,
  generatePublicCode,
} from '@/lib/domain/pass-token';
import crypto from 'node:crypto';

export class QueueService {
  private db;

  constructor(dbInstance = getDb()) {
    this.db = dbInstance;
  }

  /**
   * Automatically expires called passes whose response window has elapsed.
   */
  public async processExpiredCalls(venueId?: string): Promise<number> {
    const now = new Date();
    const conditions = [eq(schema.passes.status, 'called')];
    if (venueId) {
      conditions.push(eq(schema.passes.venueId, venueId));
    }

    // Query active called passes
    const calledPasses = await this.db
      .select({
        pass: schema.passes,
        venue: schema.venues,
      })
      .from(schema.passes)
      .innerJoin(schema.venues, eq(schema.passes.venueId, schema.venues.id))
      .where(and(...conditions));

    let expiredCount = 0;

    for (const { pass, venue } of calledPasses) {
      if (pass.calledAt) {
        const expiresAt = new Date(
          pass.calledAt.getTime() + venue.responseWindowSeconds * 1000
        );
        if (now >= expiresAt) {
          // Transition pass to skipped
          await this.db.transaction(async (tx) => {
            const result = await tx
              .update(schema.passes)
              .set({
                status: 'skipped',
                resolvedAt: now,
                version: pass.version + 1,
              })
              .where(
                and(
                  eq(schema.passes.id, pass.id),
                  eq(schema.passes.status, 'called')
                )
              )
              .returning();

            if (result.length > 0) {
              await tx.insert(schema.events).values({
                id: crypto.randomUUID(),
                venueId: pass.venueId,
                bathroomId: pass.bathroomId,
                passId: pass.id,
                type: 'PASS_SKIPPED',
                actorType: 'system',
                actorId: 'system-timer',
                metadata: { reason: 'Response window expired' },
                occurredAt: now,
              });
              expiredCount++;
            }
          });
        }
      }
    }

    return expiredCount;
  }

  /**
   * Get public venue summary including open/closed bathrooms, waiting counts, and called codes.
   */
  public async getVenueSummary(slug: string): Promise<PublicVenueSummary> {
    const venueList = await this.db
      .select()
      .from(schema.venues)
      .where(eq(schema.venues.slug, slug));

    if (venueList.length === 0) {
      throw new NotFoundError(`Venue with slug "${slug}" not found.`);
    }

    const venue = venueList[0];
    await this.processExpiredCalls(venue.id);

    const bathroomsList = await this.db
      .select()
      .from(schema.bathrooms)
      .where(eq(schema.bathrooms.venueId, venue.id))
      .orderBy(asc(schema.bathrooms.name));

    const bathroomSummaries = await Promise.all(
      bathroomsList.map(async (b) => {
        // Count waiting
        const waitingResult = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.passes)
          .where(
            and(
              eq(schema.passes.bathroomId, b.id),
              eq(schema.passes.status, 'waiting')
            )
          );
        const waitingCount = Number(waitingResult[0]?.count || 0);

        // Called pass
        const calledResult = await this.db
          .select({ publicCode: schema.passes.publicCode })
          .from(schema.passes)
          .where(
            and(
              eq(schema.passes.bathroomId, b.id),
              eq(schema.passes.status, 'called')
            )
          );

        return {
          id: b.id,
          name: b.name,
          locationHint: b.locationHint,
          state: b.state,
          waitingCount,
          estimatedWaitMinutes: waitingCount > 0 ? waitingCount * 4 : null,
          calledPassPublicCode: calledResult[0]?.publicCode || null,
        };
      })
    );

    return {
      id: venue.id,
      slug: venue.slug,
      name: venue.name,
      responseWindowSeconds: venue.responseWindowSeconds,
      bathrooms: bathroomSummaries,
    };
  }

  /**
   * Guest joins a queue for a bathroom.
   * Enforces Invariant 2 (at most one active pass per venue) and Invariant 4 (bathroom open).
   */
  public async joinQueue(params: {
    venueId: string;
    bathroomId: string;
    rawPossessionToken: string;
  }): Promise<{ pass: PassDomain; publicCode: string }> {
    const { venueId, bathroomId, rawPossessionToken } = params;
    const tokenDigest = hashPossessionToken(rawPossessionToken);

    return await this.db.transaction(async (tx) => {
      // 1. Verify bathroom exists and is open
      const bathroomRes = await tx
        .select()
        .from(schema.bathrooms)
        .where(
          and(
            eq(schema.bathrooms.id, bathroomId),
            eq(schema.bathrooms.venueId, venueId)
          )
        );

      if (bathroomRes.length === 0) {
        throw new NotFoundError('Bathroom not found.');
      }

      const bathroom = bathroomRes[0];
      if (bathroom.state !== 'open') {
        throw new BathroomClosedError();
      }

      // 2. Enforce Invariant 2: Guest can have at most one active pass in this venue
      const existingActive = await tx
        .select()
        .from(schema.passes)
        .where(
          and(
            eq(schema.passes.venueId, venueId),
            eq(schema.passes.possessionTokenDigest, tokenDigest),
            inArray(schema.passes.status, ['waiting', 'called'])
          )
        );

      if (existingActive.length > 0) {
        throw new AlreadyInQueueError();
      }

      // 3. Create Pass
      const passId = crypto.randomUUID();
      const publicCode = generatePublicCode(bathroom.name);
      const now = new Date();

      const [newPass] = await tx
        .insert(schema.passes)
        .values({
          id: passId,
          venueId,
          bathroomId,
          publicCode,
          possessionTokenDigest: tokenDigest,
          status: 'waiting',
          joinedAt: now,
          version: 1,
        })
        .returning();

      // 4. Record Event
      await tx.insert(schema.events).values({
        id: crypto.randomUUID(),
        venueId,
        bathroomId,
        passId,
        type: 'PASS_JOINED',
        actorType: 'guest',
        actorId: passId,
        metadata: { publicCode },
        occurredAt: now,
      });

      return {
        pass: newPass,
        publicCode,
      };
    });
  }

  /**
   * Get guest pass status using secret possession token.
   * Enforces Invariant 1 (token controls only its pass).
   */
  public async getPassStatus(rawPossessionToken: string): Promise<PublicPassView> {
    const tokenDigest = hashPossessionToken(rawPossessionToken);

    // Find pass
    const passList = await this.db
      .select({
        pass: schema.passes,
        bathroom: schema.bathrooms,
        venue: schema.venues,
      })
      .from(schema.passes)
      .innerJoin(schema.bathrooms, eq(schema.passes.bathroomId, schema.bathrooms.id))
      .innerJoin(schema.venues, eq(schema.passes.venueId, schema.venues.id))
      .where(eq(schema.passes.possessionTokenDigest, tokenDigest))
      .orderBy(desc(schema.passes.joinedAt));

    if (passList.length === 0) {
      throw new NotFoundError('No pass found for provided credential.');
    }

    const { pass, bathroom, venue } = passList[0];
    let currentStatus = pass.status;

    // Process auto-expiration if called
    if (pass.status === 'called' && pass.calledAt) {
      const expiresAt = new Date(
        pass.calledAt.getTime() + venue.responseWindowSeconds * 1000
      );
      if (new Date() >= expiresAt) {
        await this.processExpiredCalls(venue.id);
        // Refresh pass status cleanly
        const recheck = await this.db
          .select()
          .from(schema.passes)
          .where(eq(schema.passes.id, pass.id));
        if (recheck.length > 0) {
          currentStatus = recheck[0].status;
        }
      }
    }

    // Compute queue position if waiting
    let queuePosition: number | null = null;
    let waitingCount = 0;

    if (currentStatus === 'waiting') {
      const waitingPasses = await this.db
        .select({ id: schema.passes.id })
        .from(schema.passes)
        .where(
          and(
            eq(schema.passes.bathroomId, bathroom.id),
            eq(schema.passes.status, 'waiting')
          )
        )
        .orderBy(asc(schema.passes.joinedAt), asc(schema.passes.id));

      waitingCount = waitingPasses.length;
      const index = waitingPasses.findIndex((p) => p.id === pass.id);
      queuePosition = index !== -1 ? index + 1 : null;
    }

    const expiresAt =
      currentStatus === 'called' && pass.calledAt
        ? new Date(pass.calledAt.getTime() + venue.responseWindowSeconds * 1000)
        : null;

    return {
      id: pass.id,
      publicCode: pass.publicCode,
      bathroomId: pass.bathroomId,
      bathroomName: bathroom.name,
      status: currentStatus,
      queuePosition,
      waitingCount,
      joinedAt: pass.joinedAt,
      calledAt: pass.calledAt,
      expiresAt,
    };
  }

  /**
   * Guest leaves their active pass. Idempotent.
   */
  public async leaveQueue(rawPossessionToken: string): Promise<PassDomain> {
    const tokenDigest = hashPossessionToken(rawPossessionToken);

    return await this.db.transaction(async (tx) => {
      // 1. Try to find active pass first
      const activePasses = await tx
        .select()
        .from(schema.passes)
        .where(
          and(
            eq(schema.passes.possessionTokenDigest, tokenDigest),
            inArray(schema.passes.status, ['waiting', 'called'])
          )
        )
        .orderBy(desc(schema.passes.joinedAt))
        .limit(1);

      let pass = activePasses[0];

      if (!pass) {
        // Fallback to most recent terminal pass if none active (idempotent leave)
        const fallbackList = await tx
          .select()
          .from(schema.passes)
          .where(eq(schema.passes.possessionTokenDigest, tokenDigest))
          .orderBy(desc(schema.passes.joinedAt))
          .limit(1);

        if (fallbackList.length === 0) {
          throw new NotFoundError('No pass found for provided credential.');
        }
        pass = fallbackList[0];
      }

      // Terminal status check (Invariant 8: terminal passes never change)
      if (['completed', 'left', 'skipped'].includes(pass.status)) {
        return pass;
      }

      const now = new Date();
      const [updated] = await tx
        .update(schema.passes)
        .set({
          status: 'left',
          resolvedAt: now,
          version: pass.version + 1,
        })
        .where(eq(schema.passes.id, pass.id))
        .returning();

      await tx.insert(schema.events).values({
        id: crypto.randomUUID(),
        venueId: pass.venueId,
        bathroomId: pass.bathroomId,
        passId: pass.id,
        type: 'PASS_LEFT',
        actorType: 'guest',
        actorId: pass.id,
        metadata: { publicCode: pass.publicCode },
        occurredAt: now,
      });

      return updated;
    });
  }

  /**
   * Operator calls next pass.
   * Enforces Invariant 4 (bathroom open), Invariant 5 (atomic call of earliest waiting pass),
   * and Invariant 6 (at most one called pass per bathroom).
   */
  public async callNextPass(params: {
    venueId: string;
    bathroomId: string;
    operatorId: string;
  }): Promise<PassDomain> {
    const { venueId, bathroomId, operatorId } = params;

    return await this.db.transaction(async (tx) => {
      // 1. Check bathroom state
      const bathroomRes = await tx
        .select()
        .from(schema.bathrooms)
        .where(
          and(
            eq(schema.bathrooms.id, bathroomId),
            eq(schema.bathrooms.venueId, venueId)
          )
        );

      if (bathroomRes.length === 0) {
        throw new NotFoundError('Bathroom not found.');
      }

      const bathroom = bathroomRes[0];
      if (bathroom.state !== 'open') {
        throw new BathroomClosedError('Cannot call pass for a closed bathroom.');
      }

      // Process expirations inside venue
      const venueRes = await tx
        .select()
        .from(schema.venues)
        .where(eq(schema.venues.id, venueId));

      const venue = venueRes[0];
      const now = new Date();

      // 2. Check for existing called pass
      const existingCalled = await tx
        .select()
        .from(schema.passes)
        .where(
          and(
            eq(schema.passes.bathroomId, bathroomId),
            eq(schema.passes.status, 'called')
          )
        );

      if (existingCalled.length > 0) {
        const calledPass = existingCalled[0];
        // Check if expired
        const expiresAt = calledPass.calledAt
          ? new Date(calledPass.calledAt.getTime() + venue.responseWindowSeconds * 1000)
          : null;

        if (expiresAt && now >= expiresAt) {
          // Auto-skip expired called pass
          await tx
            .update(schema.passes)
            .set({
              status: 'skipped',
              resolvedAt: now,
              version: calledPass.version + 1,
            })
            .where(eq(schema.passes.id, calledPass.id));

          await tx.insert(schema.events).values({
            id: crypto.randomUUID(),
            venueId,
            bathroomId,
            passId: calledPass.id,
            type: 'PASS_SKIPPED',
            actorType: 'system',
            actorId: 'system-timer',
            metadata: { reason: 'Response window expired prior to call next' },
            occurredAt: now,
          });
        } else {
          throw new CalledPassExistsError();
        }
      }

      // 3. Find earliest waiting pass (FIFO order)
      const waitingPasses = await tx
        .select()
        .from(schema.passes)
        .where(
          and(
            eq(schema.passes.bathroomId, bathroomId),
            eq(schema.passes.status, 'waiting')
          )
        )
        .orderBy(asc(schema.passes.joinedAt), asc(schema.passes.id))
        .limit(1);

      if (waitingPasses.length === 0) {
        throw new NoWaitingPassError();
      }

      const passToCall = waitingPasses[0];

      // 4. Update status to called
      const [calledPass] = await tx
        .update(schema.passes)
        .set({
          status: 'called',
          calledAt: now,
          version: passToCall.version + 1,
        })
        .where(
          and(
            eq(schema.passes.id, passToCall.id),
            eq(schema.passes.status, 'waiting')
          )
        )
        .returning();

      if (!calledPass) {
        throw new PassNotActiveError('Concurrent call modified pass status.');
      }

      // 5. Invariant 10: Record event with acting operator
      await tx.insert(schema.events).values({
        id: crypto.randomUUID(),
        venueId,
        bathroomId,
        passId: calledPass.id,
        type: 'PASS_CALLED',
        actorType: 'operator',
        actorId: operatorId,
        metadata: { publicCode: calledPass.publicCode },
        occurredAt: now,
      });

      return calledPass as PassDomain;
    });
  }

  /**
   * Guest self-completes their called pass ("I'm Finished").
   * Autonomously completes visit and auto-dispatches next waiting guest.
   */
  public async guestCompletePass(rawPossessionToken: string): Promise<PassDomain> {
    const tokenDigest = hashPossessionToken(rawPossessionToken);

    return await this.db.transaction(async (tx) => {
      const passList = await tx
        .select()
        .from(schema.passes)
        .where(
          and(
            eq(schema.passes.possessionTokenDigest, tokenDigest),
            eq(schema.passes.status, 'called')
          )
        );

      if (passList.length === 0) {
        throw new NotFoundError('No active called pass found for credential.');
      }

      const pass = passList[0];
      const now = new Date();

      const [updated] = await tx
        .update(schema.passes)
        .set({
          status: 'completed',
          resolvedAt: now,
          version: pass.version + 1,
        })
        .where(eq(schema.passes.id, pass.id))
        .returning();

      await tx.insert(schema.events).values({
        id: crypto.randomUUID(),
        venueId: pass.venueId,
        bathroomId: pass.bathroomId,
        passId: pass.id,
        type: 'PASS_COMPLETED',
        actorType: 'guest',
        actorId: pass.id,
        metadata: { publicCode: pass.publicCode, selfCompleted: true },
        occurredAt: now,
      });

      // Autonomous Auto-Dispatch: Automatically call next waiting pass if bathroom is open
      const bathroomRes = await tx
        .select()
        .from(schema.bathrooms)
        .where(eq(schema.bathrooms.id, pass.bathroomId));

      if (bathroomRes.length > 0 && bathroomRes[0].state === 'open') {
        const nextWaiting = await tx
          .select()
          .from(schema.passes)
          .where(
            and(
              eq(schema.passes.bathroomId, pass.bathroomId),
              eq(schema.passes.status, 'waiting')
            )
          )
          .orderBy(asc(schema.passes.joinedAt), asc(schema.passes.id))
          .limit(1);

        if (nextWaiting.length > 0) {
          const nextToCall = nextWaiting[0];
          const [calledNext] = await tx
            .update(schema.passes)
            .set({
              status: 'called',
              calledAt: now,
              version: nextToCall.version + 1,
            })
            .where(
              and(
                eq(schema.passes.id, nextToCall.id),
                eq(schema.passes.status, 'waiting')
              )
            )
            .returning();

          if (calledNext) {
            await tx.insert(schema.events).values({
              id: crypto.randomUUID(),
              venueId: pass.venueId,
              bathroomId: pass.bathroomId,
              passId: calledNext.id,
              type: 'PASS_CALLED',
              actorType: 'system',
              actorId: 'auto-dispatcher',
              metadata: { publicCode: calledNext.publicCode, reason: 'Auto-dispatched after guest self-completion' },
              occurredAt: now,
            });
          }
        }
      }

      return updated;
    });
  }

  /**
   * Operator completes a called pass.
   */
  public async completePass(params: {
    venueId: string;
    bathroomId: string;
    passId: string;
    operatorId: string;
  }): Promise<PassDomain> {
    const { venueId, bathroomId, passId, operatorId } = params;

    return await this.db.transaction(async (tx) => {
      const passRes = await tx
        .select()
        .from(schema.passes)
        .where(
          and(
            eq(schema.passes.id, passId),
            eq(schema.passes.venueId, venueId),
            eq(schema.passes.bathroomId, bathroomId)
          )
        );

      if (passRes.length === 0) {
        throw new NotFoundError('Pass not found.');
      }

      const pass = passRes[0];

      if (pass.status === 'completed') {
        return pass as PassDomain; // Idempotent
      }

      if (pass.status !== 'called') {
        throw new PassNotActiveError(`Pass is in status "${pass.status}", expected "called".`);
      }

      const now = new Date();
      const [updated] = await tx
        .update(schema.passes)
        .set({
          status: 'completed',
          resolvedAt: now,
          version: pass.version + 1,
        })
        .where(eq(schema.passes.id, passId))
        .returning();

      await tx.insert(schema.events).values({
        id: crypto.randomUUID(),
        venueId,
        bathroomId,
        passId,
        type: 'PASS_COMPLETED',
        actorType: 'operator',
        actorId: operatorId,
        metadata: { publicCode: pass.publicCode },
        occurredAt: now,
      });

      return updated as PassDomain;
    });
  }

  /**
   * Operator skips a called or waiting pass.
   */
  public async skipPass(params: {
    venueId: string;
    bathroomId: string;
    passId: string;
    operatorId: string;
    reason?: string;
  }): Promise<PassDomain> {
    const { venueId, bathroomId, passId, operatorId, reason } = params;

    return await this.db.transaction(async (tx) => {
      const passRes = await tx
        .select()
        .from(schema.passes)
        .where(
          and(
            eq(schema.passes.id, passId),
            eq(schema.passes.venueId, venueId),
            eq(schema.passes.bathroomId, bathroomId)
          )
        );

      if (passRes.length === 0) {
        throw new NotFoundError('Pass not found.');
      }

      const pass = passRes[0];

      if (['completed', 'left', 'skipped'].includes(pass.status)) {
        return pass as PassDomain; // Idempotent
      }

      const now = new Date();
      const [updated] = await tx
        .update(schema.passes)
        .set({
          status: 'skipped',
          resolvedAt: now,
          version: pass.version + 1,
        })
        .where(eq(schema.passes.id, passId))
        .returning();

      await tx.insert(schema.events).values({
        id: crypto.randomUUID(),
        venueId,
        bathroomId,
        passId,
        type: 'PASS_SKIPPED',
        actorType: 'operator',
        actorId: operatorId,
        metadata: { publicCode: pass.publicCode, reason: reason || 'Operator skipped' },
        occurredAt: now,
      });

      return updated as PassDomain;
    });
  }

  /**
   * Operator opens or closes a bathroom.
   */
  public async toggleBathroomState(params: {
    venueId: string;
    bathroomId: string;
    state: 'open' | 'closed';
    operatorId: string;
  }): Promise<void> {
    const { venueId, bathroomId, state, operatorId } = params;

    await this.db.transaction(async (tx) => {
      const bathroomRes = await tx
        .select()
        .from(schema.bathrooms)
        .where(
          and(
            eq(schema.bathrooms.id, bathroomId),
            eq(schema.bathrooms.venueId, venueId)
          )
        );

      if (bathroomRes.length === 0) {
        throw new NotFoundError('Bathroom not found.');
      }

      const now = new Date();
      await tx
        .update(schema.bathrooms)
        .set({
          state,
          updatedAt: now,
        })
        .where(eq(schema.bathrooms.id, bathroomId));

      await tx.insert(schema.events).values({
        id: crypto.randomUUID(),
        venueId,
        bathroomId,
        passId: null,
        type: state === 'open' ? 'BATHROOM_OPENED' : 'BATHROOM_CLOSED',
        actorType: 'operator',
        actorId: operatorId,
        metadata: { newState: state },
        occurredAt: now,
      });
    });
  }

  /**
   * Operator dashboard view showing all bathrooms, active queues, called pass, and audit events.
   */
  public async getOperatorDashboard(venueId: string): Promise<OperatorDashboardView> {
    const venueList = await this.db
      .select()
      .from(schema.venues)
      .where(eq(schema.venues.id, venueId));

    if (venueList.length === 0) {
      throw new NotFoundError('Venue not found.');
    }

    const venue = venueList[0];
    await this.processExpiredCalls(venue.id);

    const bathroomsList = await this.db
      .select()
      .from(schema.bathrooms)
      .where(eq(schema.bathrooms.venueId, venue.id))
      .orderBy(asc(schema.bathrooms.name));

    const now = new Date();

    const bathroomsData = await Promise.all(
      bathroomsList.map(async (b) => {
        // Called pass
        const calledRes = await this.db
          .select()
          .from(schema.passes)
          .where(
            and(
              eq(schema.passes.bathroomId, b.id),
              eq(schema.passes.status, 'called')
            )
          );

        let calledPass: {
          id: string;
          publicCode: string;
          calledAt: Date;
          expiresAt: Date;
          isExpired: boolean;
        } | null = null;

        if (calledRes.length > 0 && calledRes[0].calledAt) {
          const cp = calledRes[0];
          const calledAtDate = cp.calledAt!;
          const expiresAt = new Date(
            calledAtDate.getTime() + venue.responseWindowSeconds * 1000
          );
          calledPass = {
            id: cp.id,
            publicCode: cp.publicCode,
            calledAt: calledAtDate,
            expiresAt,
            isExpired: now >= expiresAt,
          };
        }

        // Waiting passes
        const waitingRes = await this.db
          .select()
          .from(schema.passes)
          .where(
            and(
              eq(schema.passes.bathroomId, b.id),
              eq(schema.passes.status, 'waiting')
            )
          )
          .orderBy(asc(schema.passes.joinedAt), asc(schema.passes.id));

        const nextPass =
          waitingRes.length > 0
            ? {
                id: waitingRes[0].id,
                publicCode: waitingRes[0].publicCode,
                joinedAt: waitingRes[0].joinedAt,
              }
            : null;

        const waitingPasses = waitingRes.map((p, idx) => ({
          id: p.id,
          publicCode: p.publicCode,
          joinedAt: p.joinedAt,
          position: idx + 1,
        }));

        return {
          id: b.id,
          name: b.name,
          locationHint: b.locationHint,
          state: b.state,
          calledPass,
          waitingCount: waitingRes.length,
          nextPass,
          waitingPasses,
        };
      })
    );

    // Recent events
    const recentEventsRes = await this.db
      .select({
        event: schema.events,
        bathroom: schema.bathrooms,
      })
      .from(schema.events)
      .innerJoin(schema.bathrooms, eq(schema.events.bathroomId, schema.bathrooms.id))
      .where(eq(schema.events.venueId, venue.id))
      .orderBy(desc(schema.events.occurredAt))
      .limit(50);

    const recentEvents = recentEventsRes.map(({ event, bathroom }) => ({
      id: event.id,
      bathroomId: event.bathroomId,
      bathroomName: bathroom.name,
      passId: event.passId,
      type: event.type,
      actorType: event.actorType,
      actorId: event.actorId,
      occurredAt: event.occurredAt,
      metadata: (event.metadata as Record<string, unknown>) || {},
    }));

    return {
      venue: {
        id: venue.id,
        name: venue.name,
        slug: venue.slug,
        responseWindowSeconds: venue.responseWindowSeconds,
      },
      bathrooms: bathroomsData,
      recentEvents,
    };
  }
}
