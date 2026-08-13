import type { NextApiRequest, NextApiResponse } from 'next';
import { handleApiError } from '@/lib/api-handler';
import {
  verifyOperatorCredentials,
  createOperatorToken,
  setOperatorCookie,
} from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authSubject, password, venueSlug } = req.body;

    if (!authSubject || !password) {
      return res.status(400).json({ error: 'authSubject and password are required.' });
    }

    const operator = await verifyOperatorCredentials(
      authSubject,
      password,
      venueSlug || 'main'
    );

    if (!operator) {
      return res.status(401).json({ error: 'Invalid operator credentials.' });
    }

    const token = createOperatorToken({
      id: operator.id,
      venueId: operator.venueId,
      authSubject: operator.authSubject,
    });

    setOperatorCookie(res, token);

    return res.status(200).json({
      success: true,
      operator: {
        id: operator.id,
        authSubject: operator.authSubject,
        displayLabel: operator.displayLabel,
        venueId: operator.venueId,
      },
      token,
    });
  } catch (err) {
    return handleApiError(res, err);
  }
}
