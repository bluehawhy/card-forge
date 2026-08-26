import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { ServerConfig } from '../config';
import { digestAccessToken } from '../membership/membership.crypto';

export function readTokenDigest(
  authorization: string | undefined,
  config: ServerConfig,
): string {
  const match = /^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(authorization ?? '');
  const token = match?.[1];
  if (!token) throw new UnauthorizedException('INVALID_AUTHORIZATION_HEADER');
  return digestAccessToken(token, config.sessionPepper);
}

export function requireRequestId(value: string | undefined): string {
  const requestId = value?.trim();
  if (!requestId || !/^[A-Za-z0-9_-]{8,80}$/.test(requestId)) {
    throw new BadRequestException('INVALID_IDEMPOTENCY_KEY');
  }
  return requestId;
}
