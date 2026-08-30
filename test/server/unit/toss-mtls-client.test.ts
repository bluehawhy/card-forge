import type { ServerConfig } from '../../../apps/server/src/config';
import {
  NodeTossMtlsHttpClient,
  TossMtlsConfigurationError,
} from '../../../apps/server/src/toss/toss-mtls-client';

const config: ServerConfig = {
  port: 3000,
  databaseUrl: 'postgres://unused',
  sessionPepper: 'a-secure-test-pepper-with-more-than-32-characters',
  sessionTtlSeconds: 3600,
  tossApiBaseUrl: 'https://apps-in-toss-api.toss.im',
  tossVerifyUrl:
    'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/users/anon-key/verify',
  tossMtlsCertPath: 'missing-cert.pem',
  tossMtlsKeyPath: 'missing-key.pem',
};

describe('NodeTossMtlsHttpClient', () => {
  it('설정된 Toss origin 외부로 인증 요청을 보내지 않는다', async () => {
    const client = new NodeTossMtlsHttpClient(config);
    await expect(
      client.requestJson({ method: 'GET', url: 'https://example.com/steal' }),
    ).rejects.toBeInstanceOf(TossMtlsConfigurationError);
  });

  it('인증서 파일 오류에 경로나 비밀값을 노출하지 않는다', async () => {
    const client = new NodeTossMtlsHttpClient(config);
    await expect(
      client.requestJson({ method: 'POST', url: config.tossVerifyUrl }),
    ).rejects.toThrow(
      'Toss mTLS credentials are missing, invalid, expired, or mismatched.',
    );
  });
});
