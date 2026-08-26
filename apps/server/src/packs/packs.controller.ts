import { Body, Controller, Headers, Post } from '@nestjs/common';
import type { PacksService } from './packs.service';

@Controller('api/v1/pack-openings')
export class PacksController {
  constructor(private readonly packs: PacksService) {}
  @Post() open(
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') requestId: string | undefined,
    @Body() body: { packType?: unknown },
  ) {
    return this.packs.open(authorization, requestId, body.packType);
  }
}
