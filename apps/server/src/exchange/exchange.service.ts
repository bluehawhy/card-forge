import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { readTokenDigest, requireRequestId } from '../cards/game-auth';
import { GAME_REPOSITORY, type GameRepository } from '../cards/gameplay.types';
import { SERVER_CONFIG, type ServerConfig } from '../config';

export const CRYSTALS_PER_POINT = 3000;

@Injectable()
export class ExchangeService {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly games: GameRepository,
    @Inject(SERVER_CONFIG) private readonly config: ServerConfig,
  ) {}
  request(
    authorization: string | undefined,
    requestIdHeader: string | undefined,
    pointAmountValue: unknown,
  ) {
    if (
      !Number.isInteger(pointAmountValue) ||
      Number(pointAmountValue) < 1 ||
      Number(pointAmountValue) > 3
    )
      throw new BadRequestException('INVALID_POINT_AMOUNT');
    const pointAmount = Number(pointAmountValue);
    return this.games.exchange({
      tokenDigest: readTokenDigest(authorization, this.config),
      requestId: requireRequestId(requestIdHeader),
      pointAmount,
      crystalAmount: pointAmount * CRYSTALS_PER_POINT,
    });
  }
}
