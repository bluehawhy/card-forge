import { loadServerConfig } from './config';

const requiredEnvironment: NodeJS.ProcessEnv = {
  DATABASE_URL: 'postgres://localhost/card_forge',
  SESSION_PEPPER: 'a-secure-test-pepper-with-more-than-32-characters',
  TOSS_MTLS_CERT_PATH: '/run/secrets/toss-client.crt',
  TOSS_MTLS_KEY_PATH: '/run/secrets/toss-client.key',
};

describe('loadServerConfig', () => {
  it('공식 Toss API 주소와 안전한 mTLS 기본값을 사용한다', () => {
    const config = loadServerConfig(requiredEnvironment);

    expect(config.tossApiBaseUrl).toBe('https://apps-in-toss-api.toss.im/');
    expect(config.tossVerifyUrl).toBe(
      'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/users/anon-key/verify',
    );
    expect(config.tossMtlsCaPath).toBeUndefined();
    expect(config.tossRequestTimeoutMs).toBe(5_000);
    expect(config.tossRequestMaxRetries).toBe(1);
  });

  it('HTTP 주소와 과도한 재시도 설정을 거절한다', () => {
    expect(() =>
      loadServerConfig({
        ...requiredEnvironment,
        TOSS_API_BASE_URL: 'http://apps-in-toss-api.toss.im',
      }),
    ).toThrow('TOSS_API_BASE_URL must use HTTPS.');
    expect(() =>
      loadServerConfig({
        ...requiredEnvironment,
        TOSS_REQUEST_MAX_RETRIES: '4',
      }),
    ).toThrow('TOSS_REQUEST_MAX_RETRIES must be an integer from 0 to 3.');
  });
});
