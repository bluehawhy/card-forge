import { UserError } from '../user/domain/userError';

export const INVALID_ACCESS_ERROR_CODE = 'INVALID_ACCESS';

export function isInvalidAccess(error: unknown): boolean {
  if (!(error instanceof UserError)) return false;

  if (
    error.code === 'INVALID_MINI_APP_CATEGORY' ||
    error.code === 'UNSUPPORTED_TOSS_APP_VERSION' ||
    error.code === 'USER_IDENTITY_LOOKUP_FAILED' ||
    error.code === 'INVALID_USER_IDENTITY_RESPONSE'
  ) {
    return true;
  }

  return (
    error.serverCode === 'INVALID_USER_HASH' ||
    error.serverCode === 'TOSS_USER_VERIFICATION_FAILED'
  );
}
