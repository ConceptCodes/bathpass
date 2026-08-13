import type { NextApiRequest, NextApiResponse } from 'next';
import { queueService } from '@/lib/services';
import { handleApiError } from '@/lib/api-handler';
import { authenticateOperator } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const operator = await authenticateOperator(req);
    const { bathroomId, passId, reason } = req.body;

    if (!bathroomId || !passId) {
      return res.status(400).json({ error: 'bathroomId and passId are required.' });
    }

    const skippedPass = await queueService.skipPass({
      venueId: operator.venueId,
      bathroomId,
      passId,
      operatorId: operator.id,
      reason,
    });

    return res.status(200).json({
      success: true,
      pass: skippedPass,
    });
  } catch (err) {
    return handleApiError(res, err);
  }
}
