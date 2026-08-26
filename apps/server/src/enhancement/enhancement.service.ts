import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { readTokenDigest, requireRequestId } from '../cards/game-auth';
import {
  type EnhancementResult,
  GAME_REPOSITORY,
  type GameRepository,
} from '../cards/gameplay.types';
import { SERVER_CONFIG, type ServerConfig } from '../config';
import {
  DESTRUCTION_ASH_REWARDS,
  ENHANCEMENT_COIN_COSTS,
  ENHANCEMENT_RATES,
  ENHANCEMENT_RATE_VERSION,
} from './enhancement-rate.config';

@Injectable()
export class EnhancementService {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly games: GameRepository,
    @Inject(SERVER_CONFIG) private readonly config: ServerConfig,
  ) {}

  async enhance(
    authorization: string | undefined,
    requestIdHeader: string | undefined,
    cardIdValue: unknown,
  ) {
    if (
      typeof cardIdValue !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(cardIdValue)
    )
      throw new BadRequestException('INVALID_CARD_ID');
    const tokenDigest = readTokenDigest(authorization, this.config);
    const card = await this.games.getCard(tokenDigest, cardIdValue);
    if (card === null)
      throw new UnauthorizedException('INVALID_OR_EXPIRED_SESSION');
    if (!card || card.status !== 'OWNED')
      throw new NotFoundException('CARD_NOT_FOUND');
    const rate = ENHANCEMENT_RATES[card.enhancementLevel];
    if (!rate) throw new ConflictException('MAX_ENHANCEMENT_LEVEL');
    const coinCost = ENHANCEMENT_COIN_COSTS?.[card.enhancementLevel];
    const ashReward = DESTRUCTION_ASH_REWARDS?.[card.enhancementLevel];
    if (coinCost === undefined || ashReward === undefined) {
      throw new ServiceUnavailableException(
        'ENHANCEMENT_ECONOMY_NOT_CONFIGURED',
      );
    }
    const roll = randomInt(0, 1_000_000) / 1_000_000;
    const result: EnhancementResult =
      roll < rate.success
        ? 'SUCCESS'
        : roll < rate.success + rate.destroy
          ? 'DESTROYED'
          : 'FAILURE';
    return this.games.enhance({
      tokenDigest,
      requestId: requireRequestId(requestIdHeader),
      cardId: card.cardId,
      expectedLevel: card.enhancementLevel,
      result,
      coinCost,
      ashReward,
      probabilityVersion: ENHANCEMENT_RATE_VERSION,
    });
  }
}
