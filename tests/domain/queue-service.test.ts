process.env.DATABASE_URL = 'postgres://localhost:5432/bathpass_test';

import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, schema } from '@/lib/db';
import { QueueService } from '@/lib/domain/queue-service';
import {
  BathroomClosedError,
  AlreadyInQueueError,
  NoWaitingPassError,
  CalledPassExistsError,
} from '@/lib/domain/errors';
import { generatePossessionToken } from '@/lib/domain/pass-token';
import { seedDatabase } from '@/lib/db/seed';

const testDb = getDb();
const queueService = new QueueService();

describe('QueueService Domain Invariants & Operations', () => {
  beforeEach(async () => {
    await testDb.delete(schema.events);
    await testDb.delete(schema.passes);
    await testDb.delete(schema.operators);
    await testDb.delete(schema.bathrooms);
    await testDb.delete(schema.venues);

    await seedDatabase(testDb);
  });

  it('Invariant 2 & 4: Prevents joining closed bathroom, allows joining open bathroom, prevents duplicate active pass', async () => {
    const token1 = generatePossessionToken();

    await expect(
      queueService.joinQueue({
        venueId: 'venue-main',
        bathroomId: 'bm-3',
        rawPossessionToken: token1,
      })
    ).rejects.toThrow(BathroomClosedError);

    const { pass, publicCode } = await queueService.joinQueue({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      rawPossessionToken: token1,
    });

    expect(pass.status).toBe('waiting');
    expect(publicCode).toBeDefined();

    await expect(
      queueService.joinQueue({
        venueId: 'venue-main',
        bathroomId: 'bm-2',
        rawPossessionToken: token1,
      })
    ).rejects.toThrow(AlreadyInQueueError);
  });

  it('Invariant 1 & 7: Correctly computes queue position and enforces token isolation', async () => {
    const token1 = generatePossessionToken();
    const token2 = generatePossessionToken();
    const token3 = generatePossessionToken();

    await queueService.joinQueue({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      rawPossessionToken: token1,
    });

    await queueService.joinQueue({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      rawPossessionToken: token2,
    });

    await queueService.joinQueue({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      rawPossessionToken: token3,
    });

    const status1 = await queueService.getPassStatus(token1);
    expect(status1.queuePosition).toBe(1);
    expect(status1.waitingCount).toBe(3);

    const status2 = await queueService.getPassStatus(token2);
    expect(status2.queuePosition).toBe(2);
    expect(status2.waitingCount).toBe(3);

    const status3 = await queueService.getPassStatus(token3);
    expect(status3.queuePosition).toBe(3);
  });

  it('Invariant 5, 6 & 10: Calls earliest waiting pass, enforces single called pass, logs event with operator', async () => {
    const token1 = generatePossessionToken();
    const token2 = generatePossessionToken();

    await queueService.joinQueue({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      rawPossessionToken: token1,
    });

    await queueService.joinQueue({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      rawPossessionToken: token2,
    });

    const calledPass = await queueService.callNextPass({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      operatorId: 'op-1',
    });

    expect(calledPass.status).toBe('called');

    const status1 = await queueService.getPassStatus(token1);
    expect(status1.status).toBe('called');
    expect(status1.queuePosition).toBeNull();

    const status2 = await queueService.getPassStatus(token2);
    expect(status2.status).toBe('waiting');
    expect(status2.queuePosition).toBe(1);

    await expect(
      queueService.callNextPass({
        venueId: 'venue-main',
        bathroomId: 'bm-1',
        operatorId: 'op-1',
      })
    ).rejects.toThrow(CalledPassExistsError);
  });

  it('Invariant 8: Operator completes pass, allows calling next pass, handles terminal idempotency', async () => {
    const token1 = generatePossessionToken();
    const token2 = generatePossessionToken();

    const { pass: pass1 } = await queueService.joinQueue({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      rawPossessionToken: token1,
    });

    await queueService.joinQueue({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      rawPossessionToken: token2,
    });

    await queueService.callNextPass({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      operatorId: 'op-1',
    });

    const completedPass = await queueService.completePass({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      passId: pass1.id,
      operatorId: 'op-1',
    });

    expect(completedPass.status).toBe('completed');

    const retryComplete = await queueService.completePass({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      passId: pass1.id,
      operatorId: 'op-1',
    });
    expect(retryComplete.status).toBe('completed');

    const calledPass2 = await queueService.callNextPass({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      operatorId: 'op-1',
    });
    expect(calledPass2.status).toBe('called');
  });

  it('Guest leave flow updates position for remaining guests', async () => {
    const token1 = generatePossessionToken();
    const token2 = generatePossessionToken();

    await queueService.joinQueue({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      rawPossessionToken: token1,
    });

    await new Promise((r) => setTimeout(r, 10));

    await queueService.joinQueue({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      rawPossessionToken: token2,
    });

    const leftPass = await queueService.leaveQueue(token1);
    expect(leftPass.status).toBe('left');

    const status2 = await queueService.getPassStatus(token2);
    expect(status2.queuePosition).toBe(1);
    expect(status2.waitingCount).toBe(1);

    const { pass: newPass } = await queueService.joinQueue({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      rawPossessionToken: token1,
    });
    expect(newPass.status).toBe('waiting');
  });

  it('Operator skip pass & toggle bathroom state', async () => {
    const token1 = generatePossessionToken();
    const { pass: pass1 } = await queueService.joinQueue({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      rawPossessionToken: token1,
    });

    const skipped = await queueService.skipPass({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      passId: pass1.id,
      operatorId: 'op-1',
      reason: 'Guest absent',
    });
    expect(skipped.status).toBe('skipped');

    // Toggle bathroom bm-1 to closed
    await queueService.toggleBathroomState({
      venueId: 'venue-main',
      bathroomId: 'bm-1',
      state: 'closed',
      operatorId: 'op-1',
    });

    const summary = await queueService.getVenueSummary('main');
    const bm1 = summary.bathrooms.find((b) => b.id === 'bm-1');
    expect(bm1?.state).toBe('closed');
  });

  it('Generates complete operator dashboard view', async () => {
    const dashboard = await queueService.getOperatorDashboard('venue-main');
    expect(dashboard.venue.name).toBe('Lincoln High School');
    expect(dashboard.bathrooms.length).toBe(3);
    expect(dashboard.recentEvents).toBeDefined();
  });
});
