import { Body, Controller, Headers, Post } from '@nestjs/common';
import type { ExchangeService } from './exchange.service';

@Controller('api/v1/point-exchanges')
export class ExchangeController {
  constructor(private readonly exchange: ExchangeService) {}
  @Post() request(
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') requestId: string | undefined,
    @Body() body: { pointAmount?: unknown },
  ) {
    return this.exchange.request(authorization, requestId, body.pointAmount);
  }
}
