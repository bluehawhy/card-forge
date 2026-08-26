import { Inject, Injectable } from '@nestjs/common';
import { readTokenDigest } from '../cards/game-auth';
import { GAME_REPOSITORY, type GameRepository } from '../cards/gameplay.types';
import { SERVER_CONFIG, type ServerConfig } from '../config';

@Injectable()
export class FraudDetectionService {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly games: GameRepository,
    @Inject(SERVER_CONFIG) private readonly config: ServerConfig,
  ) {}
  record(
    authorization: string | undefined,
    eventType: string,
    requestId?: string,
    details?: Record<string, unknown>,
  ) {
    return this.games.recordAudit({
      tokenDigest: authorization
        ? readTokenDigest(authorization, this.config)
        : undefined,
      eventType,
      requestId,
      details,
    });
  }
}
