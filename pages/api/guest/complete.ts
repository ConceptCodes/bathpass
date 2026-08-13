import type { NextApiRequest, NextApiResponse } from 'next';
import { queueService } from '@/lib/services';
import { handleApiError } from '@/lib/api-handler';
import { getGuestPossessionToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = getGuestPossessionToken(req);
    if (!token) {
      return res.status(401).json({ error: 'No guest token found.' });
    }

    const pass = await queueService.guestCompletePass(token);
    return res.status(200).json({
      success: true,
      pass,
    });
  } catch (err) {
    return handleApiError(res, err);
  }
}
