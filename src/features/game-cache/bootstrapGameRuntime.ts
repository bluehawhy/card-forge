import { createUserService } from '../../services/userService';
import {
  UserError,
  createAppsInTossGameUserIdentityProvider,
  createHttpUserRepository,
} from '../user';
import { INVALID_ACCESS_ERROR_CODE, isInvalidAccess } from './accessValidation';
import { gameCache } from './gameCache';
import { gameRuntime } from './gameRuntime';
import { createHttpGameServerGateway } from './httpGameServerGateway';
import {
  ALLOW_LOCAL_GAMEPLAY_TEST_FALLBACK,
  createLocalGameplayTestGateway,
} from './localGameplayTestGateway';

export const GAME_API_BASE_URL =
  'https://nmbdwukrvwfaxpasbppj.supabase.co/functions/v1/game-api';

let pending: Promise<void> | null = null;

export function bootstrapGameRuntime(): Promise<void> {
  if (pending) return pending;
  const gateway = createHttpGameServerGateway({
    apiBaseUrl: GAME_API_BASE_URL,
  });
  const users = createUserService({
    gameUserIdentityProvider: createAppsInTossGameUserIdentityProvider(),
    userRepository: createHttpUserRepository({ apiBaseUrl: GAME_API_BASE_URL }),
  });
  gameRuntime.configure(gateway, 'server');
  pending = initializeAuthenticatedRuntime(users).catch((error) => {
    pending = null;
    throw error;
  });
  return pending;
}

type InitializingUserService = Pick<
  ReturnType<typeof createUserService>,
  'initializeCurrentUser'
>;

async function initializeAuthenticatedRuntime(
  users: InitializingUserService,
): Promise<void> {
  gameCache.beginLoad();

  try {
    const session = await users.initializeCurrentUser();
    gameCache.setCurrentUser(session.user);
    await gameRuntime.initialize(session.accessToken);
  } catch (error) {
    if (shouldUseLocalTestFallback(error)) {
      gameRuntime.configure(createLocalGameplayTestGateway(), 'local-test');
      await gameRuntime.initialize('local-gameplay-test');
      return;
    }

    if (isInvalidAccess(error)) {
      gameCache.failLoad({
        code: INVALID_ACCESS_ERROR_CODE,
        message: '잘못된 접근입니다.',
      });
      return;
    }

    gameCache.failLoad({
      code: 'USER_INITIALIZATION_FAILED',
      message: '사용자 정보를 확인하지 못했습니다.',
    });
    throw error;
  }
}

function shouldUseLocalTestFallback(error: unknown): boolean {
  return (
    ALLOW_LOCAL_GAMEPLAY_TEST_FALLBACK &&
    error instanceof UserError &&
    error.serverCode === 'TOSS_VERIFICATION_NOT_CONFIGURED'
  );
}
