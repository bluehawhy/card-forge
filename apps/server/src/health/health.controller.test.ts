import { ServiceUnavailableException } from '@nestjs/common';
import type { TossMtlsHttpClient } from '../toss/toss-mtls-client';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const client: jest.Mocked<TossMtlsHttpClient> = {
    requestJson: jest.fn(),
    checkReadiness: jest.fn(),
    close: jest.fn(),
  };
  const controller = new HealthController(client);

  beforeEach(() => jest.clearAllMocks());

  it('프로세스 생존 상태를 반환한다', () => {
    expect(controller.getLiveness()).toEqual({ status: 'ok' });
  });

  it('mTLS 인증서가 준비되면 만료 시각을 반환한다', async () => {
    client.checkReadiness.mockResolvedValue({
      ready: true,
      expiresAt: '2030-01-01T00:00:00.000Z',
    });

    await expect(controller.getReadiness()).resolves.toEqual({
      status: 'ready',
      dependencies: {
        tossMtls: {
          status: 'ready',
          expiresAt: '2030-01-01T00:00:00.000Z',
        },
      },
    });
  });

  it('mTLS 인증서가 준비되지 않으면 상세 비밀 없이 503을 반환한다', async () => {
    client.checkReadiness.mockRejectedValue(
      new Error('/run/secrets/private-client.key'),
    );

    await expect(controller.getReadiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(controller.getReadiness()).rejects.not.toThrow(
      '/run/secrets/private-client.key',
    );
  });
});
