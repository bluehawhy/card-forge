import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { readTokenDigest, requireRequestId } from '../cards/game-auth';
import {
  GAME_REPOSITORY,
  type GameRepository,
  type PackType,
} from '../cards/gameplay.types';
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
  ) {}

  async freeStatus(authorization: string | undefined) {
    const availability = await this.games.getPackAvailability(
      readTokenDigest(authorization, this.config),
      'FREE',
    );
    if (!availability)
      throw new UnauthorizedException('INVALID_OR_EXPIRED_SESSION');
    return availability;
  }

  openFree(
    authorization: string | undefined,
    requestIdHeader: string | undefined,
  ) {
    return this.open(authorization, requestIdHeader, 'FREE');
  }

  open(
    authorization: string | undefined,
    requestIdHeader: string | undefined,
    packTypeValue: unknown,
  ) {
    if (packTypeValue !== 'FREE' && packTypeValue !== 'AD')
      throw new BadRequestException('INVALID_PACK_TYPE');
    const tokenDigest = readTokenDigest(authorization, this.config);
    const requestId = requireRequestId(requestIdHeader);
    const reward = this.rewards.draw();
    return this.games.openPack({
      tokenDigest,
      requestId,
      packType: packTypeValue as PackType,
      element: reward.element,
      grade: reward.grade,
      probabilityVersion: this.rewards.version,
    });
  }
}
