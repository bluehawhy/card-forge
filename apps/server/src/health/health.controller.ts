import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  TOSS_MTLS_HTTP_CLIENT,
  type TossMtlsHttpClient,
} from '../toss/toss-mtls-client';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(TOSS_MTLS_HTTP_CLIENT)
    private readonly tossMtlsClient: TossMtlsHttpClient,
  ) {}

  @Get('live')
  getLiveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async getReadiness(): Promise<{
    status: 'ready';
    dependencies: {
      tossMtls: { status: 'ready'; expiresAt: string };
    };
  }> {
    try {
      const readiness = await this.tossMtlsClient.checkReadiness();
      return {
        status: 'ready',
        dependencies: {
          tossMtls: {
            status: 'ready',
            expiresAt: readiness.expiresAt,
          },
        },
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        dependencies: { tossMtls: { status: 'not_ready' } },
      });
    }
  }
}
