import { Inject, Injectable } from '@nestjs/common';
import { SERVER_CONFIG, type ServerConfig } from '../config';
import {
  TOSS_MTLS_HTTP_CLIENT,
  type TossMtlsHttpClient,
} from '../toss/toss-mtls-client';
import type { TossGameUserVerifier } from './membership.types';

interface TossVerificationResponse {
  resultType: string;
  success?: string | boolean;
}

@Injectable()
export class HttpTossGameUserVerifier implements TossGameUserVerifier {
  constructor(
    @Inject(SERVER_CONFIG) private readonly config: ServerConfig,
    @Inject(TOSS_MTLS_HTTP_CLIENT)
    private readonly httpClient: TossMtlsHttpClient,
  ) {}

  async verify(tossGameUserHash: string): Promise<{ stableUserKey: string }> {
    const response =
      await this.httpClient.requestJson<TossVerificationResponse>({
        method: 'POST',
        url: this.config.tossVerifyUrl,
        headers: { 'x-anon-key': tossGameUserHash },
      });
    if (
      response.resultType !== 'SUCCESS' ||
      (response.success !== true && response.success !== 'true')
    ) {
      throw new Error('Toss user hash verification failed.');
    }

    // 검증된 hash는 이 앱 안에서만 안정적인 식별자다. 호출자는 즉시 HMAC
    // digest로 변환하며 원문을 저장하거나 로그에 남기지 않는다.
    return { stableUserKey: tossGameUserHash };
  }
}
