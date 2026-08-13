import type { NextApiRequest, NextApiResponse } from 'next';
import { queueService } from '@/lib/services';
import { handleApiError } from '@/lib/api-handler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const slug = (req.query.slug as string) || 'main';
    const summary = await queueService.getVenueSummary(slug);
    return res.status(200).json(summary);
  } catch (err) {
    return handleApiError(res, err);
  }
}
