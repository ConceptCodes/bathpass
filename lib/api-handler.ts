import type { NextApiResponse } from 'next';
import { DomainError } from '@/lib/domain/errors';

export function handleApiError(res: NextApiResponse, err: unknown) {
  if (err instanceof DomainError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  console.error('Unhandled API error:', err);
  return res.status(500).json({
    error: 'An unexpected internal server error occurred.',
    code: 'INTERNAL_SERVER_ERROR',
  });
}
