import type { NextApiRequest, NextApiResponse } from 'next';
import { queueService } from '@/lib/services';
import { handleApiError } from '@/lib/api-handler';
import { getGuestPossessionToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = getGuestPossessionToken(req);

    if (!token) {
      return res.status(401).json({
        error: 'No active pass credential found on device.',
        code: 'UNAUTHORIZED',
      });
    }

    const passView = await queueService.getPassStatus(token);
    return res.status(200).json(passView);
  } catch (err) {
    return handleApiError(res, err);
  }
}
