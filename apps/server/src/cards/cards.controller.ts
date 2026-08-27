import { Controller, Get, Headers, Param } from '@nestjs/common';
import type { CardsService } from './cards.service';

@Controller('api/v1/cards')
export class CardsController {
  constructor(private readonly cards: CardsService) {}
  @Get() list(@Headers('authorization') authorization?: string) {
    return this.cards.list(authorization);
  }
  @Get(':cardId') get(
    @Headers('authorization') authorization: string | undefined,
    @Param('cardId') cardId: string,
  ) {
    return this.cards.get(authorization, cardId);
  }
}
