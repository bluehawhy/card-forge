import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SERVER_CONFIG, type ServerConfig } from '../config';
import { readTokenDigest, requireRequestId } from './game-auth';
import { GAME_REPOSITORY, type GameRepository } from './gameplay.types';

@Injectable()
export class CardsService {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly games: GameRepository,
    @Inject(SERVER_CONFIG) private readonly config: ServerConfig,
  ) {}

  async list(authorization?: string) {
    const cards = await this.games.listCards(
      readTokenDigest(authorization, this.config),
    );
    if (!cards) throw new UnauthorizedException('INVALID_OR_EXPIRED_SESSION');
    return { cards };
  }

  async get(authorization: string | undefined, cardId: string) {
    const card = await this.games.getCard(
      readTokenDigest(authorization, this.config),
      cardId,
    );
    if (card === null)
      throw new UnauthorizedException('INVALID_OR_EXPIRED_SESSION');
    if (!card) throw new NotFoundException('CARD_NOT_FOUND');
    return card;
  }

  sell(
    authorization: string | undefined,
    requestIdHeader: string | undefined,
    cardId: string,
  ) {
    if (!isUuid(cardId)) throw new BadRequestException('INVALID_CARD_ID');
    return this.games.sellCard({
      tokenDigest: readTokenDigest(authorization, this.config),
      requestId: requireRequestId(requestIdHeader),
      cardId,
    });
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
