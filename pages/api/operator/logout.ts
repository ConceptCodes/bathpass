import type { NextApiRequest, NextApiResponse } from 'next';
import { clearOperatorCookie } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  clearOperatorCookie(res);
  return res.status(200).json({ success: true });
}
