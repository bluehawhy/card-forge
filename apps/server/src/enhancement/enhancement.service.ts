import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AD_REWARD_VERIFIER,
  type AdRewardVerifier,
  requireAdCompletionId,
} from '../ads/ad-reward.verifier';
import { readTokenDigest, requireRequestId } from '../cards/game-auth';
import {
  GAME_RULES_VERSION,
  MAX_ENHANCEMENT_LEVEL,
  successRateForTargetLevel,
} from '../cards/game-rules-v2';
import {
  type EnhancementResult,
  GAME_REPOSITORY,
  type GameRepository,
} from '../cards/gameplay.types';
import { SERVER_CONFIG, type ServerConfig } from '../config';

@Injectable()
export class EnhancementService {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly games: GameRepository,
    @Inject(SERVER_CONFIG) private readonly config: ServerConfig,
    @Inject(AD_REWARD_VERIFIER) private readonly ads: AdRewardVerifier,
  ) {}

  async enhance(
    authorization: string | undefined,
    requestIdHeader: string | undefined,
    cardIdValue: unknown,
    adCompletionIdValue: unknown,
  ) {
    if (
      typeof cardIdValue !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(cardIdValue)
    )
      throw new BadRequestException('INVALID_CARD_ID');
    let adCompletionId: string;
    try {
      adCompletionId = requireAdCompletionId(adCompletionIdValue);
    } catch {
      throw new BadRequestException('INVALID_AD_COMPLETION_ID');
    }
    const tokenDigest = readTokenDigest(authorization, this.config);
    const card = await this.games.getCard(tokenDigest, cardIdValue);
    if (card === null)
      throw new UnauthorizedException('INVALID_OR_EXPIRED_SESSION');
    if (!card || card.status === 'SOLD' || card.status === 'DESTROYED')
      throw new NotFoundException('CARD_NOT_FOUND');
    if (card.status === 'ENHANCEMENT_LOCKED')
      throw new ConflictException('ENHANCEMENT_PERMANENTLY_LOCKED');
    if (
      card.status === 'MAX_LEVEL' ||
      card.enhancementLevel >= MAX_ENHANCEMENT_LEVEL
    )
      throw new ConflictException('MAX_ENHANCEMENT_LEVEL');
    if (
      !(await this.ads.verify({
        completionId: adCompletionId,
        purpose: 'ENHANCEMENT',
        subjectDigest: tokenDigest,
      }))
    )
      throw new ForbiddenException('AD_COMPLETION_NOT_VERIFIED');
    const targetLevel = card.enhancementLevel + 1;
    const rate = successRateForTargetLevel(targetLevel);
    const result: EnhancementResult =
      randomInt(0, 1_000_000) / 1_000_000 < rate ? 'SUCCESS' : 'FAILURE';
    return this.games.enhance({
      tokenDigest,
      requestId: requireRequestId(requestIdHeader),
      cardId: card.cardId,
      expectedLevel: card.enhancementLevel,
      result,
      probabilityVersion: GAME_RULES_VERSION,
      adCompletionId,
    });
  }
}
