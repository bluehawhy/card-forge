import { Body, Controller, Get, Headers, Inject, Post } from '@nestjs/common';
import { PacksService } from './packs.service';

@Controller('api/v1/pack-openings')
export class PacksController {
  constructor(@Inject(PacksService) private readonly packs: PacksService) {}

  @Get('free/status') freeStatus(
    @Headers('authorization') authorization: string | undefined,
  ) {
    return this.packs.freeStatus(authorization);
  }

  @Post('free') openFree(
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') requestId: string | undefined,
  ) {
    return this.packs.openFree(authorization, requestId);
  }

  @Post() open(
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') requestId: string | undefined,
    @Body() body: { packType?: unknown },
  ) {
    return this.packs.open(authorization, requestId, body.packType);
  }
}
