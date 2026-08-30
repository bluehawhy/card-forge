import type {
  CurrentUserProfile,
  UserSession,
} from '../../../src/features/user/domain/user';
import { createHttpUserRepository } from '../../../src/features/user/infrastructure/httpUserRepository';

const currentUser: CurrentUserProfile = {
  userId: 'user-001',
  displayName: '초보 대장장이',
  accountStatus: 'ACTIVE',
  createdAt: '2026-08-26T00:00:00.000Z',
  lastSignedInAt: '2026-08-26T00:00:00.000Z',
};

const userSession: UserSession = {
  accessToken: 'access-token-001',
  user: currentUser,
  isNewUser: true,
};

function createJsonResponse(responseBody: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(JSON.stringify(responseBody)),
  } as unknown as Response;
}

describe('httpUserRepository', () => {
  it('게임 사용자 식별키를 명시적인 JSON 필드로 전송한다', async () => {
    const fetchImplementation = jest
      .fn()
      .mockResolvedValue(createJsonResponse(userSession));
    const repository = createHttpUserRepository({
      apiBaseUrl: 'https://api.card-forge.example/',
      fetchImplementation,
    });

    const result = await repository.initializeUserSession(
      'toss-game-user-hash-001',
    );

    expect(result).toEqual(userSession);
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://api.card-forge.example/api/v1/user-sessions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ tossGameUserHash: 'toss-game-user-hash-001' }),
      }),
    );
  });

  it('내 정보 조회 시 현재 세션의 Bearer 토큰을 사용한다', async () => {
    const fetchImplementation = jest
      .fn()
      .mockResolvedValue(createJsonResponse(currentUser));
    const repository = createHttpUserRepository({
      apiBaseUrl: 'https://api.card-forge.example',
      fetchImplementation,
    });

    await repository.getCurrentUser('access-token-001');

    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://api.card-forge.example/api/v1/users/me',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token-001',
        }),
      }),
    );
  });

  it('서버 응답 본문을 노출하지 않고 상태 코드만 UserError로 전달한다', async () => {
    const fetchImplementation = jest
      .fn()
      .mockResolvedValue(
        createJsonResponse({ message: '사용이 정지된 회원입니다.' }, 403),
      );
    const repository = createHttpUserRepository({
      apiBaseUrl: 'https://api.card-forge.example',
      fetchImplementation,
    });

    await expect(
      repository.getCurrentUser('blocked-token'),
    ).rejects.toMatchObject({
      code: 'USER_API_REQUEST_FAILED',
      message: '회원 API 요청에 실패했습니다. (403)',
    });
  });

  it('성공 응답도 회원 세션 형식이 아니면 거절한다', async () => {
    const fetchImplementation = jest
      .fn()
      .mockResolvedValue(createJsonResponse({ accessToken: 'token-only' }));
    const repository = createHttpUserRepository({
      apiBaseUrl: 'https://api.card-forge.example',
      fetchImplementation,
    });

    await expect(
      repository.initializeUserSession('toss-game-user-hash-001'),
    ).rejects.toMatchObject({ code: 'INVALID_USER_API_RESPONSE' });
  });
});
