import type {
  CurrentUserProfile,
  UpdateCurrentUserProfileInput,
  UserSession,
} from '../features/user/domain/user';
import { UserError } from '../features/user/domain/userError';
import type { GameUserIdentityProvider } from '../features/user/ports/gameUserIdentityProvider';
import type { UserRepository } from '../features/user/ports/userRepository';

export interface UserServiceDependencies {
  gameUserIdentityProvider: GameUserIdentityProvider;
  userRepository: UserRepository;
}

export interface UserService {
  initializeCurrentUser(): Promise<UserSession>;
  getCurrentUser(): Promise<CurrentUserProfile>;
  updateCurrentUserDisplayName(
    displayName: string,
  ): Promise<CurrentUserProfile>;
  clearCurrentUserSession(): void;
}

export function createUserService({
  gameUserIdentityProvider,
  userRepository,
}: UserServiceDependencies): UserService {
  let currentUserSession: UserSession | null = null;
  let pendingInitialization: Promise<UserSession> | null = null;

  async function initializeCurrentUser(): Promise<UserSession> {
    if (currentUserSession !== null) {
      return currentUserSession;
    }

    if (pendingInitialization !== null) {
      return pendingInitialization;
    }

    pendingInitialization = (async () => {
      const tossGameUserHash = await gameUserIdentityProvider.getGameUserHash();
      const initializedUserSession =
        await userRepository.initializeUserSession(tossGameUserHash);
      currentUserSession = initializedUserSession;
      return initializedUserSession;
    })();

    try {
      return await pendingInitialization;
    } finally {
      pendingInitialization = null;
    }
  }

  async function getCurrentUser(): Promise<CurrentUserProfile> {
    const initializedSession = requireCurrentUserSession(currentUserSession);
    const currentUser = await userRepository.getCurrentUser(
      initializedSession.accessToken,
    );
    currentUserSession = { ...initializedSession, user: currentUser };
    return currentUser;
  }

  async function updateCurrentUserDisplayName(
    displayName: string,
  ): Promise<CurrentUserProfile> {
    const normalizedDisplayName = displayName.trim();

    if (normalizedDisplayName.length < 2 || normalizedDisplayName.length > 12) {
      throw new UserError(
        'INVALID_DISPLAY_NAME',
        '닉네임은 공백을 제외하고 2자 이상 12자 이하여야 합니다.',
      );
    }

    const initializedSession = requireCurrentUserSession(currentUserSession);
    const profileInput: UpdateCurrentUserProfileInput = {
      displayName: normalizedDisplayName,
    };
    const updatedUser = await userRepository.updateCurrentUserProfile(
      initializedSession.accessToken,
      profileInput,
    );

    currentUserSession = { ...initializedSession, user: updatedUser };
    return updatedUser;
  }

  function clearCurrentUserSession(): void {
    currentUserSession = null;
    pendingInitialization = null;
  }

  return {
    initializeCurrentUser,
    getCurrentUser,
    updateCurrentUserDisplayName,
    clearCurrentUserSession,
  };
}

function requireCurrentUserSession(
  currentUserSession: UserSession | null,
): UserSession {
  if (currentUserSession === null) {
    throw new UserError(
      'USER_SESSION_NOT_INITIALIZED',
      '회원 세션을 먼저 초기화해야 합니다. initializeCurrentUser()를 호출해 주세요.',
    );
  }

  return currentUserSession;
}
