import crypto from 'node:crypto';

/**
 * Generates a high-entropy raw possession token for a Guest pass.
 * This raw token is returned to the guest client ONCE and saved in an HTTP-only cookie.
 */
export function generatePossessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes a standard SHA-256 hex digest of a raw possession token.
 * Only this digest is stored on the server / in the database.
 */
export function hashPossessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generates a human-friendly, high-contrast 4-character short code for verbal callouts.
 * Excludes easily confused characters (like 0, O, 1, I, L).
 */
export function generatePublicCode(bathroomName?: string): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  const bytes = crypto.randomBytes(4);
  for (let i = 0; i < 4; i++) {
    result += chars[bytes[i] % chars.length];
  }
  const prefix = bathroomName ? bathroomName.charAt(0).toUpperCase() : 'B';
  return `${prefix}-${result}`;
}
