import { getUserKeyForGame } from '@apps-in-toss/framework';
import { appLogger } from '../../../utils/appLogger';
import { UserError } from '../domain/userError';
import type { GameUserIdentityProvider } from '../ports/gameUserIdentityProvider';

export function createAppsInTossGameUserIdentityProvider(): GameUserIdentityProvider {
  return {
    async getGameUserHash(): Promise<string> {
      let userKeyResult: Awaited<ReturnType<typeof getUserKeyForGame>>;

      appLogger.info('TOSS_USER', 'getUserKeyForGame() 호출 시작');

      try {
        userKeyResult = await getUserKeyForGame();
      } catch (error) {
        appLogger.error(
          'TOSS_USER',
          'getUserKeyForGame() 호출 중 예외 발생',
          error,
        );
        throw new UserError(
          'USER_IDENTITY_LOOKUP_FAILED',
          '앱인토스 사용자 식별키를 가져오지 못했습니다.',
          error,
        );
      }

      if (userKeyResult === undefined) {
        appLogger.warn('TOSS_USER', 'getUserKeyForGame() 결과: undefined');
        throw new UserError(
          'UNSUPPORTED_TOSS_APP_VERSION',
          '현재 토스 앱 버전에서는 게임 사용자 식별 기능을 지원하지 않습니다.',
        );
      }

      if (userKeyResult === 'INVALID_CATEGORY') {
        appLogger.warn(
          'TOSS_USER',
          'getUserKeyForGame() 결과: INVALID_CATEGORY',
        );
        throw new UserError(
          'INVALID_MINI_APP_CATEGORY',
          '게임 카테고리 미니앱에서만 사용자 식별키를 발급할 수 있습니다.',
        );
      }

      if (userKeyResult === 'ERROR') {
        appLogger.error('TOSS_USER', 'getUserKeyForGame() 결과: ERROR');
        throw new UserError(
          'USER_IDENTITY_LOOKUP_FAILED',
          '앱인토스 사용자 식별키 발급에 실패했습니다.',
        );
      }

      if (
        userKeyResult.type !== 'HASH' ||
        userKeyResult.hash.trim().length === 0
      ) {
        appLogger.error(
          'TOSS_USER',
          'getUserKeyForGame() 응답 형식 오류',
          userKeyResult,
        );
        throw new UserError(
          'INVALID_USER_IDENTITY_RESPONSE',
          '앱인토스 사용자 식별 응답 형식이 올바르지 않습니다.',
        );
      }

      appLogger.info(
        'TOSS_USER',
        `getUserKeyForGame() 성공 - hash=${userKeyResult.hash}`,
      );

      return userKeyResult.hash.trim();
    },
  };
}
