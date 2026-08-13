import type { NextApiRequest, NextApiResponse } from 'next';
import { queueService } from '@/lib/services';
import { handleApiError } from '@/lib/api-handler';
import {
  getGuestPossessionToken,
  setGuestPossessionToken,
} from '@/lib/auth';
import { generatePossessionToken } from '@/lib/domain/pass-token';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { venueId, bathroomId } = req.body;

    if (!venueId || !bathroomId) {
      return res.status(400).json({ error: 'venueId and bathroomId are required.' });
    }

    let token = getGuestPossessionToken(req);
    if (!token) {
      token = generatePossessionToken();
    }

    const { pass, publicCode } = await queueService.joinQueue({
      venueId,
      bathroomId,
      rawPossessionToken: token,
    });

    setGuestPossessionToken(res, token);

    return res.status(201).json({
      pass: {
        id: pass.id,
        publicCode: pass.publicCode,
        bathroomId: pass.bathroomId,
        status: pass.status,
      },
      publicCode,
    });
  } catch (err) {
    return handleApiError(res, err);
  }
}
