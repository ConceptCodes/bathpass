import type { NextApiRequest, NextApiResponse } from 'next';
import { queueService } from '@/lib/services';
import { handleApiError } from '@/lib/api-handler';
import { authenticateOperator } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const operator = await authenticateOperator(req);
    const dashboard = await queueService.getOperatorDashboard(operator.venueId);

    return res.status(200).json({
      operator: {
        id: operator.id,
        authSubject: operator.authSubject,
        displayLabel: operator.displayLabel,
      },
      dashboard,
    });
  } catch (err) {
    return handleApiError(res, err);
  }
}
