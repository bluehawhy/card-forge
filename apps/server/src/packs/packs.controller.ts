import { Body, Controller, Get, Headers, Inject, Post } from '@nestjs/common';
import { PacksService } from './packs.service';

@Controller('api/v1/pack-openings')
export class PacksController {
  constructor(@Inject(PacksService) private readonly packs: PacksService) {}

  @Get('status') status(
    @Headers('authorization') authorization: string | undefined,
  ) {
    return this.packs.status(authorization);
  }

  @Post() open(
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') requestId: string | undefined,
    @Body() body: { adCompletionId?: unknown },
  ) {
    return this.packs.open(authorization, requestId, body.adCompletionId);
  }
}
