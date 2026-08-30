import { getUserKeyForGame } from '@apps-in-toss/framework';
import { createAppsInTossGameUserIdentityProvider } from '../../../src/features/user/infrastructure/appsInTossGameUserIdentityProvider';

jest.mock('@apps-in-toss/framework', () => ({
  getUserKeyForGame: jest.fn(),
}));

const mockedGetUserKeyForGame = jest.mocked(getUserKeyForGame);

describe('appsInTossGameUserIdentityProvider', () => {
  beforeEach(() => {
    mockedGetUserKeyForGame.mockReset();
  });

  it('HASH 응답에서 게임 사용자 식별키만 반환한다', async () => {
    mockedGetUserKeyForGame.mockResolvedValue({
      type: 'HASH',
      hash: 'game-user-hash-001',
    });
    const identityProvider = createAppsInTossGameUserIdentityProvider();

    await expect(identityProvider.getGameUserHash()).resolves.toBe(
      'game-user-hash-001',
    );
  });

  it('지원하지 않는 토스 앱 버전을 구분한다', async () => {
    mockedGetUserKeyForGame.mockResolvedValue(undefined);
    const identityProvider = createAppsInTossGameUserIdentityProvider();

    await expect(identityProvider.getGameUserHash()).rejects.toMatchObject({
      code: 'UNSUPPORTED_TOSS_APP_VERSION',
    });
  });

  it('게임이 아닌 미니앱 카테고리를 구분한다', async () => {
    mockedGetUserKeyForGame.mockResolvedValue('INVALID_CATEGORY');
    const identityProvider = createAppsInTossGameUserIdentityProvider();

    await expect(identityProvider.getGameUserHash()).rejects.toMatchObject({
      code: 'INVALID_MINI_APP_CATEGORY',
    });
  });

  it('SDK 오류 응답을 회원 식별 오류로 변환한다', async () => {
    mockedGetUserKeyForGame.mockResolvedValue('ERROR');
    const identityProvider = createAppsInTossGameUserIdentityProvider();

    await expect(identityProvider.getGameUserHash()).rejects.toMatchObject({
      code: 'USER_IDENTITY_LOOKUP_FAILED',
    });
  });
});
