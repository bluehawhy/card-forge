import { Body, Controller, Headers, Post } from '@nestjs/common';
import type { EnhancementService } from './enhancement.service';

@Controller('api/v1/enhancements')
export class EnhancementController {
  constructor(private readonly enhancement: EnhancementService) {}
  @Post() enhance(
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') requestId: string | undefined,
    @Body() body: { cardId?: unknown; adCompletionId?: unknown },
  ) {
    return this.enhancement.enhance(
      authorization,
      requestId,
      body.cardId,
      body.adCompletionId,
    );
  }
}
