import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AD_REWARD_VERIFIER,
  type AdRewardVerifier,
  requireAdCompletionId,
} from '../ads/ad-reward.verifier';
import { readTokenDigest, requireRequestId } from '../cards/game-auth';
import { GAME_REPOSITORY, type GameRepository } from '../cards/gameplay.types';
import { SERVER_CONFIG, type ServerConfig } from '../config';
import {
  PACK_REWARD_POLICY,
  type PackRewardPolicy,
} from './pack-reward.policy';

@Injectable()
export class PacksService {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly games: GameRepository,
    @Inject(SERVER_CONFIG) private readonly config: ServerConfig,
    @Inject(PACK_REWARD_POLICY) private readonly rewards: PackRewardPolicy,
    @Inject(AD_REWARD_VERIFIER) private readonly ads: AdRewardVerifier,
  ) {}

  async status(authorization: string | undefined) {
    const availability = await this.games.getPackAvailability(
      readTokenDigest(authorization, this.config),
      'AD',
    );
    if (!availability)
      throw new UnauthorizedException('INVALID_OR_EXPIRED_SESSION');
    return availability;
  }

  async open(
    authorization: string | undefined,
    requestIdHeader: string | undefined,
    adCompletionIdValue: unknown,
  ) {
    let adCompletionId: string;
    try {
      adCompletionId = requireAdCompletionId(adCompletionIdValue);
    } catch {
      throw new BadRequestException('INVALID_AD_COMPLETION_ID');
    }
    const tokenDigest = readTokenDigest(authorization, this.config);
    const requestId = requireRequestId(requestIdHeader);
    if (
      !(await this.ads.verify({
        completionId: adCompletionId,
        purpose: 'PACK',
        subjectDigest: tokenDigest,
      }))
    )
      throw new ForbiddenException('AD_COMPLETION_NOT_VERIFIED');
    const reward = this.rewards.draw();
    return this.games.openPack({
      tokenDigest,
      requestId,
      packType: 'AD',
      element: reward.element,
      grade: reward.grade,
      probabilityVersion: this.rewards.version,
      adCompletionId,
    });
  }
}
