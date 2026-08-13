import type { NextApiRequest, NextApiResponse } from 'next';
import { parseCookie, stringifySetCookie } from 'cookie';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getDb, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { OperatorDomain } from '@/lib/domain/types';
import { UnauthorizedError } from '@/lib/domain/errors';
import { env } from '@/lib/env';

const GUEST_COOKIE_NAME = 'bathpass_token';
const OPERATOR_COOKIE_NAME = 'bathpass_operator';
const SESSION_SECRET = env.SESSION_SECRET;

/**
 * Gets or extracts the guest possession token from cookie or Authorization header.
 */
export function getGuestPossessionToken(req: NextApiRequest): string | null {
  const cookies = parseCookie(req.headers.cookie || '');
  if (cookies[GUEST_COOKIE_NAME]) {
    return cookies[GUEST_COOKIE_NAME];
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Sets the guest possession token in an HTTP-only cookie.
 */
export function setGuestPossessionToken(res: NextApiResponse, rawToken: string) {
  const serialized = stringifySetCookie({
    name: GUEST_COOKIE_NAME,
    value: rawToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days retention
  });

  res.setHeader('Set-Cookie', serialized);
}

/**
 * Clears the guest possession token cookie.
 */
export function clearGuestPossessionToken(res: NextApiResponse) {
  const serialized = stringifySetCookie({
    name: GUEST_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  res.setHeader('Set-Cookie', serialized);
}

/**
 * Creates a signed operator session token.
 */
export function createOperatorToken(operator: { id: string; venueId: string; authSubject: string }): string {
  const payload = JSON.stringify({
    id: operator.id,
    venueId: operator.venueId,
    authSubject: operator.authSubject,
    exp: Date.now() + 1000 * 60 * 60 * 24, // 24 hours
  });

  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');

  return Buffer.from(payload).toString('base64url') + '.' + signature;
}

/**
 * Verifies a signed operator session token using timingSafeEqual.
 */
export function verifyOperatorToken(token: string): { id: string; venueId: string; authSubject: string } | null {
  try {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) return null;

    const payloadStr = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadStr)
      .digest('hex');

    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expectedSignature, 'hex');

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(payloadStr);
    if (Date.now() > payload.exp) return null;

    return {
      id: payload.id,
      venueId: payload.venueId,
      authSubject: payload.authSubject,
    };
  } catch {
    return null;
  }
}

/**
 * Authenticates an operator request from cookie or header.
 */
export async function authenticateOperator(
  req: NextApiRequest,
  dbInstance = getDb()
): Promise<OperatorDomain> {
  const cookies = parseCookie(req.headers.cookie || '');
  const token = cookies[OPERATOR_COOKIE_NAME] || (req.headers['x-operator-token'] as string);

  if (!token) {
    throw new UnauthorizedError('Operator session missing.');
  }

  const verified = verifyOperatorToken(token);
  if (!verified) {
    throw new UnauthorizedError('Invalid or expired operator session.');
  }

  const ops = await dbInstance
    .select()
    .from(schema.operators)
    .where(
      and(
        eq(schema.operators.id, verified.id),
        eq(schema.operators.isActive, true)
      )
    );

  if (ops.length === 0) {
    throw new UnauthorizedError('Operator not found or inactive.');
  }

  return ops[0] as OperatorDomain;
}

/**
 * Sets the operator session cookie.
 */
export function setOperatorCookie(res: NextApiResponse, token: string) {
  const serialized = stringifySetCookie({
    name: OPERATOR_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  res.setHeader('Set-Cookie', serialized);
}

/**
 * Clears the operator session cookie.
 */
export function clearOperatorCookie(res: NextApiResponse) {
  const serialized = stringifySetCookie({
    name: OPERATOR_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  res.setHeader('Set-Cookie', serialized);
}

/**
 * Verifies operator credentials against database.
 */
export async function verifyOperatorCredentials(
  authSubject: string,
  plainPassword: string,
  venueSlug = 'main',
  dbInstance = getDb()
): Promise<OperatorDomain | null> {
  const venueList = await dbInstance
    .select()
    .from(schema.venues)
    .where(eq(schema.venues.slug, venueSlug));

  if (venueList.length === 0) return null;
  const venue = venueList[0];

  const ops = await dbInstance
    .select()
    .from(schema.operators)
    .where(
      and(
        eq(schema.operators.venueId, venue.id),
        eq(schema.operators.authSubject, authSubject),
        eq(schema.operators.isActive, true)
      )
    );

  if (ops.length === 0) return null;

  const operator = ops[0];
  const valid = await bcrypt.compare(plainPassword, operator.passwordHash);
  if (!valid) return null;

  return operator as OperatorDomain;
}
