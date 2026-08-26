import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SERVER_CONFIG, type ServerConfig } from '../config';
import {
  createAccessToken,
  digestAccessToken,
  digestStableUserKey,
} from './membership.crypto';
import {
  TOSS_GAME_USER_VERIFIER,
  type TossGameUserVerifier,
  USER_REPOSITORY,
  type UserRepository,
} from './membership.types';

@Injectable()
export class MembershipService {
  constructor(
    @Inject(TOSS_GAME_USER_VERIFIER)
    private readonly verifier: TossGameUserVerifier,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SERVER_CONFIG) private readonly config: ServerConfig,
  ) {}

  async initializeSession(tossGameUserHash: unknown) {
    if (!isBoundedString(tossGameUserHash, 16, 4096))
      throw new BadRequestException('INVALID_USER_HASH');
    const verified = await this.verifier.verify(tossGameUserHash);
    const stableDigest = digestStableUserKey(
      verified.stableUserKey,
      this.config.sessionPepper,
    );
    const accessToken = createAccessToken();
    const tokenDigest = digestAccessToken(
      accessToken,
      this.config.sessionPepper,
    );
    const expiresAt = new Date(
      Date.now() + this.config.sessionTtlSeconds * 1000,
    );
    const result = await this.users.initializeUser(
      stableDigest,
      tokenDigest,
      expiresAt,
    );
    return { accessToken, ...result };
  }

  async getCurrentUser(accessToken: string) {
    const user = await this.users.findUserBySessionToken(
      this.tokenDigest(accessToken),
    );
    if (!user) throw new UnauthorizedException('INVALID_OR_EXPIRED_SESSION');
    return user;
  }

  async updateDisplayName(accessToken: string, displayName: unknown) {
    if (typeof displayName !== 'string') {
      throw new BadRequestException('INVALID_DISPLAY_NAME');
    }
    const normalized = displayName.normalize('NFC').trim();
    if (
      !isBoundedString(normalized, 2, 12) ||
      normalized.includes('\u200B') ||
      normalized.includes('\u200C') ||
      normalized.includes('\u200D') ||
      normalized.includes('\uFEFF')
    ) {
      throw new BadRequestException('INVALID_DISPLAY_NAME');
    }
    const user = await this.users.updateDisplayName(
      this.tokenDigest(accessToken),
      normalized,
    );
    if (!user) throw new UnauthorizedException('INVALID_OR_EXPIRED_SESSION');
    return user;
  }

  async revokeSession(accessToken: string): Promise<void> {
    const revoked = await this.users.revokeSession(
      this.tokenDigest(accessToken),
    );
    if (!revoked) throw new UnauthorizedException('INVALID_OR_EXPIRED_SESSION');
  }

  private tokenDigest(accessToken: string): string {
    if (!isBoundedString(accessToken, 32, 256))
      throw new UnauthorizedException('INVALID_SESSION');
    return digestAccessToken(accessToken, this.config.sessionPepper);
  }
}

function isBoundedString(
  value: unknown,
  min: number,
  max: number,
): value is string {
  return (
    typeof value === 'string' && value.length >= min && value.length <= max
  );
}
