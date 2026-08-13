import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, schema } from '@/lib/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    return res.status(200).json({
      status: 'ok',
      service: 'bathpass',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(503).json({
      status: 'unhealthy',
      error: err.message,
    });
  }
}
