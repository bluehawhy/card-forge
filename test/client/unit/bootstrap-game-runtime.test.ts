import { isInvalidAccess } from '../../../src/features/game-cache/accessValidation';
import { UserError } from '../../../src/features/user/domain/userError';

describe('bootstrapGameRuntime access validation', () => {
  it.each([
    'INVALID_MINI_APP_CATEGORY',
    'UNSUPPORTED_TOSS_APP_VERSION',
    'USER_IDENTITY_LOOKUP_FAILED',
    'INVALID_USER_IDENTITY_RESPONSE',
  ] as const)('%s 식별 오류를 잘못된 접근으로 분류한다', (code) => {
    expect(isInvalidAccess(new UserError(code, 'identity error'))).toBe(true);
  });

  it.each(['INVALID_USER_HASH', 'TOSS_USER_VERIFICATION_FAILED'])(
    '%s 서버 검증 실패를 잘못된 접근으로 분류한다',
    (serverCode) => {
      expect(
        isInvalidAccess(
          new UserError(
            'USER_API_REQUEST_FAILED',
            'request failed',
            undefined,
            {
              httpStatus: 401,
              serverCode,
            },
          ),
        ),
      ).toBe(true);
    },
  );

  it('일반적인 서버 연결 실패는 잘못된 접근으로 분류하지 않는다', () => {
    expect(
      isInvalidAccess(
        new UserError('USER_API_REQUEST_FAILED', 'network unavailable'),
      ),
    ).toBe(false);
  });
});
