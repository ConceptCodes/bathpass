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
    const { bathroomId } = req.body;

    if (!bathroomId) {
      return res.status(400).json({ error: 'bathroomId is required.' });
    }

    const calledPass = await queueService.callNextPass({
      venueId: operator.venueId,
      bathroomId,
      operatorId: operator.id,
    });

    return res.status(200).json({
      success: true,
      pass: calledPass,
    });
  } catch (err) {
    return handleApiError(res, err);
  }
}
