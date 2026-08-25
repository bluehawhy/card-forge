import type {
  CurrentUserProfile,
  UserSession,
} from '../features/user/domain/user';
import type { GameUserIdentityProvider } from '../features/user/ports/gameUserIdentityProvider';
import type { UserRepository } from '../features/user/ports/userRepository';
import { createUserService } from './userService';

const initialUser: CurrentUserProfile = {
  userId: 'user-001',
  displayName: '초보 대장장이',
  accountStatus: 'ACTIVE',
  createdAt: '2026-08-26T00:00:00.000Z',
  lastSignedInAt: '2026-08-26T00:00:00.000Z',
};

const initialSession: UserSession = {
  accessToken: 'access-token-001',
  user: initialUser,
  isNewUser: true,
};

function createDependencies(): {
  gameUserIdentityProvider: GameUserIdentityProvider;
  userRepository: jest.Mocked<UserRepository>;
} {
  return {
    gameUserIdentityProvider: {
      getGameUserHash: jest.fn().mockResolvedValue('toss-game-user-hash-001'),
    },
    userRepository: {
      initializeUserSession: jest.fn().mockResolvedValue(initialSession),
      getCurrentUser: jest.fn().mockResolvedValue(initialUser),
      updateCurrentUserProfile: jest
        .fn()
        .mockImplementation(async (_accessToken, profileInput) => ({
          ...initialUser,
          displayName: profileInput.displayName,
        })),
    },
  };
}

describe('userService', () => {
  it('앱인토스 게임 사용자 식별키로 현재 회원을 자동 조회하거나 생성한다', async () => {
    const dependencies = createDependencies();
    const userService = createUserService(dependencies);

    const session = await userService.initializeCurrentUser();

    expect(session).toEqual(initialSession);
    expect(
      dependencies.userRepository.initializeUserSession,
    ).toHaveBeenCalledWith('toss-game-user-hash-001');
  });

  it('동시에 초기화해도 회원 생성 요청은 한 번만 보낸다', async () => {
    const dependencies = createDependencies();
    const userService = createUserService(dependencies);

    const [firstSession, secondSession] = await Promise.all([
      userService.initializeCurrentUser(),
      userService.initializeCurrentUser(),
    ]);

    expect(firstSession).toBe(secondSession);
    expect(
      dependencies.userRepository.initializeUserSession,
    ).toHaveBeenCalledTimes(1);
  });

  it('초기화 전에는 내 정보를 조회하지 않는다', async () => {
    const dependencies = createDependencies();
    const userService = createUserService(dependencies);

    await expect(userService.getCurrentUser()).rejects.toMatchObject({
      code: 'USER_SESSION_NOT_INITIALIZED',
    });
    expect(dependencies.userRepository.getCurrentUser).not.toHaveBeenCalled();
  });

  it('초기화 도중 세션을 지우면 늦게 도착한 응답을 현재 세션으로 복원하지 않는다', async () => {
    const dependencies = createDependencies();
    let resolveInitialization!: (session: UserSession) => void;
    dependencies.userRepository.initializeUserSession.mockReturnValue(
      new Promise((resolve) => {
        resolveInitialization = resolve;
      }),
    );
    const userService = createUserService(dependencies);

    const pendingInitialization = userService.initializeCurrentUser();
    await Promise.resolve();
    userService.clearCurrentUserSession();
    resolveInitialization(initialSession);
    await pendingInitialization;

    await expect(userService.getCurrentUser()).rejects.toMatchObject({
      code: 'USER_SESSION_NOT_INITIALIZED',
    });
  });

  it('닉네임 앞뒤 공백을 제거해 현재 회원 정보만 변경한다', async () => {
    const dependencies = createDependencies();
    const userService = createUserService(dependencies);
    await userService.initializeCurrentUser();

    const updatedUser =
      await userService.updateCurrentUserDisplayName('  불의 장인  ');

    expect(updatedUser.displayName).toBe('불의 장인');
    expect(
      dependencies.userRepository.updateCurrentUserProfile,
    ).toHaveBeenCalledWith(initialSession.accessToken, {
      displayName: '불의 장인',
    });
  });

  it('2자 미만 또는 12자를 초과하는 닉네임을 거절한다', async () => {
    const dependencies = createDependencies();
    const userService = createUserService(dependencies);
    await userService.initializeCurrentUser();

    await expect(
      userService.updateCurrentUserDisplayName('가'),
    ).rejects.toMatchObject({
      code: 'INVALID_DISPLAY_NAME',
    });
    await expect(
      userService.updateCurrentUserDisplayName('1234567890123'),
    ).rejects.toMatchObject({
      code: 'INVALID_DISPLAY_NAME',
    });
  });
});
