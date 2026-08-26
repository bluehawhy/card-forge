import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { ServerConfig } from '../config';
import { MembershipService } from './membership.service';
import type {
  TossGameUserVerifier,
  UserProfile,
  UserRepository,
} from './membership.types';

const config: ServerConfig = {
  port: 3000,
  databaseUrl: 'postgres://unused',
  sessionPepper: 'a-secure-test-pepper-with-more-than-32-characters',
  sessionTtlSeconds: 3600,
  tossVerifyUrl: 'https://verify.example/',
  tossMtlsCertPath: 'cert',
  tossMtlsKeyPath: 'key',
  tossMtlsCaPath: 'ca',
};

const user: UserProfile = {
  userId: '824b0e99-e3b7-4ead-a097-2255157e81f8',
  displayName: '초보 대장장이',
  accountStatus: 'ACTIVE',
  createdAt: '2026-08-26T00:00:00.000Z',
  lastSignedInAt: '2026-08-26T00:00:00.000Z',
};

function setup() {
  const verifier: jest.Mocked<TossGameUserVerifier> = {
    verify: jest
      .fn()
      .mockResolvedValue({ stableUserKey: 'verified-stable-key' }),
  };
  const repository: jest.Mocked<UserRepository> = {
    initializeUser: jest.fn().mockResolvedValue({ user, isNewUser: true }),
    findUserBySessionToken: jest.fn().mockResolvedValue(user),
    updateDisplayName: jest
      .fn()
      .mockResolvedValue({ ...user, displayName: '불의 장인' }),
    revokeSession: jest.fn().mockResolvedValue(true),
  };
  return {
    verifier,
    repository,
    service: new MembershipService(verifier, repository, config),
  };
}

describe('MembershipService', () => {
  it('Toss 검증 결과를 원문이 아닌 digest로 저장하고 opaque session을 발급한다', async () => {
    const { service, verifier, repository } = setup();
    const result = await service.initializeSession(
      'toss-game-user-hash-that-is-long-enough',
    );
    expect(verifier.verify).toHaveBeenCalledWith(
      'toss-game-user-hash-that-is-long-enough',
    );
    const call = repository.initializeUser.mock.calls[0];
    if (!call) throw new Error('initializeUser was not called.');
    const [stableDigest, tokenDigest] = call;
    expect(stableDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(stableDigest).not.toContain('verified-stable-key');
    expect(result.accessToken).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('비어 있거나 과도하게 큰 hash를 Toss 서버에 전송하지 않는다', async () => {
    const { service, verifier } = setup();
    await expect(service.initializeSession('short')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('만료된 session은 현재 회원으로 인정하지 않는다', async () => {
    const { service, repository } = setup();
    repository.findUserBySessionToken.mockResolvedValue(null);
    await expect(service.getCurrentUser('a'.repeat(43))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('닉네임을 NFC 정규화하고 zero-width 문자를 거절한다', async () => {
    const { service, repository } = setup();
    await service.updateDisplayName('a'.repeat(43), '  불의 장인  ');
    expect(repository.updateDisplayName).toHaveBeenCalledWith(
      expect.any(String),
      '불의 장인',
    );
    await expect(
      service.updateDisplayName('a'.repeat(43), '불\u200B장인'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('로그아웃 시 현재 opaque session을 폐기한다', async () => {
    const { service, repository } = setup();
    await service.revokeSession('a'.repeat(43));
    expect(repository.revokeSession).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
  });
});
