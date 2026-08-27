import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SERVER_CONFIG, type ServerConfig } from '../config';
import { readTokenDigest } from './game-auth';
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
}
