export type UserErrorCode =
  | 'INVALID_MINI_APP_CATEGORY'
  | 'UNSUPPORTED_TOSS_APP_VERSION'
  | 'USER_IDENTITY_LOOKUP_FAILED'
  | 'INVALID_USER_IDENTITY_RESPONSE'
  | 'USER_API_REQUEST_FAILED'
  | 'USER_SESSION_NOT_INITIALIZED'
  | 'INVALID_DISPLAY_NAME';

export class UserError extends Error {
  readonly code: UserErrorCode;
  readonly cause?: unknown;

  constructor(code: UserErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'UserError';
    this.code = code;
    this.cause = cause;
  }
}
