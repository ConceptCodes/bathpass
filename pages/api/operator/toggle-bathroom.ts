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
    const { bathroomId, state } = req.body;

    if (!bathroomId || !state || !['open', 'closed'].includes(state)) {
      return res.status(400).json({ error: 'Valid bathroomId and state ("open"|"closed") are required.' });
    }

    await queueService.toggleBathroomState({
      venueId: operator.venueId,
      bathroomId,
      state,
      operatorId: operator.id,
    });

    return res.status(200).json({ success: true, state });
  } catch (err) {
    return handleApiError(res, err);
  }
}
