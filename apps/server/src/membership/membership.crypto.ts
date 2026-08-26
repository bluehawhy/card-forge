import { createHash, createHmac, randomBytes } from 'node:crypto';

export function digestStableUserKey(
  stableUserKey: string,
  pepper: string,
): string {
  return createHmac('sha256', pepper).update(stableUserKey).digest('hex');
}

export function createAccessToken(): string {
  return randomBytes(32).toString('base64url');
}

export function digestAccessToken(accessToken: string, pepper: string): string {
  return createHash('sha256').update(`${pepper}:${accessToken}`).digest('hex');
}
