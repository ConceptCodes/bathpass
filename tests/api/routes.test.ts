process.env.DATABASE_URL = 'postgres://localhost:5432/bathpass_test';

import { describe, it, expect, beforeEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { getDb, schema } from '@/lib/db';
import { seedDatabase } from '@/lib/db/seed';

import venueHandler from '@/pages/api/venue';
import joinHandler from '@/pages/api/guest/join';
import passHandler from '@/pages/api/guest/pass';
import leaveHandler from '@/pages/api/guest/leave';
import loginHandler from '@/pages/api/operator/login';
import dashboardHandler from '@/pages/api/operator/dashboard';
import callNextHandler from '@/pages/api/operator/call-next';
import completeHandler from '@/pages/api/operator/complete';

const testDb = getDb();

describe('API Route Handlers Integration', () => {
  beforeEach(async () => {
    await testDb.delete(schema.events);
    await testDb.delete(schema.passes);
    await testDb.delete(schema.operators);
    await testDb.delete(schema.bathrooms);
    await testDb.delete(schema.venues);

    await seedDatabase(testDb);
  });

  it('GET /api/venue returns public venue summary', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { slug: 'main' },
    });

    await venueHandler(req, res);
    expect(res._getStatusCode()).toBe(200);

    const data = JSON.parse(res._getData());
    expect(data.name).toBe('Lincoln High School');
    expect(data.bathrooms.length).toBe(3);
  });

  it('Guest flow: Join queue, check status, leave queue via API', async () => {
    // 1. Join queue
    const { req: joinReq, res: joinRes } = createMocks({
      method: 'POST',
      body: {
        venueId: 'venue-main',
        bathroomId: 'bm-1',
      },
    });

    await joinHandler(joinReq, joinRes);
    expect(joinRes._getStatusCode()).toBe(201);

    const joinData = JSON.parse(joinRes._getData());
    expect(joinData.publicCode).toBeDefined();
    expect(joinData.possessionToken).toBeUndefined();

    const rawGuestCookie = joinRes._getHeaders()['set-cookie'];
    expect(rawGuestCookie).toBeDefined();
    const guestCookieStr = (Array.isArray(rawGuestCookie) ? rawGuestCookie[0] : rawGuestCookie)?.split(';')[0] || '';

    // 2. Fetch status using cookie header
    const { req: passReq, res: passRes } = createMocks({
      method: 'GET',
      headers: {
        cookie: guestCookieStr,
      },
    });

    await passHandler(passReq, passRes);
    expect(passRes._getStatusCode()).toBe(200);

    const passData = JSON.parse(passRes._getData());
    expect(passData.status).toBe('waiting');
    expect(passData.queuePosition).toBe(1);

    // 3. Leave queue
    const { req: leaveReq, res: leaveRes } = createMocks({
      method: 'POST',
      headers: {
        cookie: guestCookieStr,
      },
    });

    await leaveHandler(leaveReq, leaveRes);
    expect(leaveRes._getStatusCode()).toBe(200);
    const leaveData = JSON.parse(leaveRes._getData());
    expect(leaveData.success).toBe(true);
  });

  it('Operator flow: Login, view dashboard, call next pass, complete pass', async () => {
    // 1. Operator Login
    const { req: loginReq, res: loginRes } = createMocks({
      method: 'POST',
      body: {
        authSubject: 'operator',
        password: 'bathpass2026',
      },
    });

    await loginHandler(loginReq, loginRes);
    expect(loginRes._getStatusCode()).toBe(200);

    const loginData = JSON.parse(loginRes._getData());
    expect(loginData.success).toBe(true);

    const opCookie = loginRes._getHeaders()['set-cookie'];
    const rawCookieHeader = Array.isArray(opCookie) ? opCookie[0] : opCookie;
    const cookieStr = rawCookieHeader ? rawCookieHeader.split(';')[0] : '';

    // 2. Join a guest pass first
    const { req: joinReq, res: joinRes } = createMocks({
      method: 'POST',
      body: { venueId: 'venue-main', bathroomId: 'bm-1' },
    });
    await joinHandler(joinReq, joinRes);

    // 3. Fetch Dashboard
    const { req: dashReq, res: dashRes } = createMocks({
      method: 'GET',
      headers: { cookie: cookieStr },
    });
    await dashboardHandler(dashReq, dashRes);
    expect(dashRes._getStatusCode()).toBe(200);
    const dashData = JSON.parse(dashRes._getData());
    expect(dashData.dashboard.bathrooms[0].waitingCount).toBe(1);

    // 4. Operator calls next pass
    const { req: callReq, res: callRes } = createMocks({
      method: 'POST',
      headers: { cookie: cookieStr },
      body: { bathroomId: 'bm-1' },
    });
    await callNextHandler(callReq, callRes);
    expect(callRes._getStatusCode()).toBe(200);
    const callData = JSON.parse(callRes._getData());
    expect(callData.pass.status).toBe('called');

    // 5. Operator completes pass
    const { req: compReq, res: compRes } = createMocks({
      method: 'POST',
      headers: { cookie: cookieStr },
      body: { bathroomId: 'bm-1', passId: callData.pass.id },
    });
    await completeHandler(compReq, compRes);
    expect(compRes._getStatusCode()).toBe(200);
    const compData = JSON.parse(compRes._getData());
    expect(compData.pass.status).toBe('completed');
  });
});
