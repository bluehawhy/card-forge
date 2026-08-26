import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { readTokenDigest, requireRequestId } from '../cards/game-auth';
import {
  type Element,
  GAME_REPOSITORY,
  type GameRepository,
  type Grade,
  type PackType,
} from '../cards/gameplay.types';
import { SERVER_CONFIG, type ServerConfig } from '../config';

const ELEMENTS: Element[] = ['FIRE', 'WATER', 'EARTH', 'WIND', 'LIGHT', 'DARK'];
// GAME_RULES.md에서 출시 전 확정하기로 한 값이다. 확정 전까지 팩 개봉을 막는다.
const GRADE_THRESHOLDS: ReadonlyArray<{ grade: Grade; max: number }> | null =
  null;

@Injectable()
export class PacksService {
  static readonly probabilityVersion = 'pack-v1';
  constructor(
    @Inject(GAME_REPOSITORY) private readonly games: GameRepository,
    @Inject(SERVER_CONFIG) private readonly config: ServerConfig,
  ) {}

  open(
    authorization: string | undefined,
    requestIdHeader: string | undefined,
    packTypeValue: unknown,
  ) {
    if (packTypeValue !== 'FREE' && packTypeValue !== 'AD')
      throw new BadRequestException('INVALID_PACK_TYPE');
    const tokenDigest = readTokenDigest(authorization, this.config);
    const requestId = requireRequestId(requestIdHeader);
    if (!GRADE_THRESHOLDS)
      throw new ServiceUnavailableException('PACK_PROBABILITY_NOT_CONFIGURED');
    const roll = randomInt(0, 10000);
    return this.games.openPack({
      tokenDigest,
      requestId,
      packType: packTypeValue as PackType,
      element: ELEMENTS[randomInt(0, ELEMENTS.length)] ?? 'FIRE',
      grade:
        GRADE_THRESHOLDS.find((item) => roll < item.max)?.grade ?? 'NORMAL',
      probabilityVersion: PacksService.probabilityVersion,
    });
  }
}
