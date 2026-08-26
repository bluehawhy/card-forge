import type {
  CurrentUserProfile,
  UpdateCurrentUserProfileInput,
  UserSession,
} from '../domain/user';
import { USER_ACCOUNT_STATUSES } from '../domain/user';
import { UserError } from '../domain/userError';
import type { UserRepository } from '../ports/userRepository';

export interface HttpUserRepositoryOptions {
  apiBaseUrl: string;
  fetchImplementation?: typeof fetch;
}

export function createHttpUserRepository({
  apiBaseUrl,
  fetchImplementation = fetch,
}: HttpUserRepositoryOptions): UserRepository {
  const normalizedApiBaseUrl = apiBaseUrl.replace(/\/$/, '');

  async function requestJson<ResponseBody>(
    path: string,
    requestInit: RequestInit,
    isValidResponseBody: (value: unknown) => value is ResponseBody,
  ): Promise<ResponseBody> {
    let response: Response;

    try {
      response = await fetchImplementation(
        `${normalizedApiBaseUrl}${path}`,
        requestInit,
      );
    } catch (error) {
      throw new UserError(
        'USER_API_REQUEST_FAILED',
        '회원 서버에 연결하지 못했습니다.',
        error,
      );
    }

    const responseText = await response.text();
    const responseBody = parseResponseBody(responseText);

    if (!response.ok) {
      throw new UserError(
        'USER_API_REQUEST_FAILED',
        `회원 API 요청에 실패했습니다. (${response.status})`,
      );
    }

    if (!isValidResponseBody(responseBody)) {
      throw new UserError(
        'INVALID_USER_API_RESPONSE',
        '회원 API 응답 형식이 올바르지 않습니다.',
      );
    }

    return responseBody;
  }

  return {
    initializeUserSession(tossGameUserHash: string): Promise<UserSession> {
      return requestJson<UserSession>(
        '/api/v1/user-sessions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tossGameUserHash }),
        },
        isUserSession,
      );
    },

    getCurrentUser(accessToken: string): Promise<CurrentUserProfile> {
      return requestJson<CurrentUserProfile>(
        '/api/v1/users/me',
        {
          method: 'GET',
          headers: createAuthorizedHeaders(accessToken),
        },
        isCurrentUserProfile,
      );
    },

    updateCurrentUserProfile(
      accessToken: string,
      profileInput: UpdateCurrentUserProfileInput,
    ): Promise<CurrentUserProfile> {
      return requestJson<CurrentUserProfile>(
        '/api/v1/users/me',
        {
          method: 'PATCH',
          headers: createAuthorizedHeaders(accessToken),
          body: JSON.stringify(profileInput),
        },
        isCurrentUserProfile,
      );
    },
  };
}

function createAuthorizedHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

function parseResponseBody(responseText: string): unknown | null {
  if (responseText.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch (error) {
    throw new UserError(
      'USER_API_REQUEST_FAILED',
      '회원 API가 올바른 JSON을 반환하지 않았습니다.',
      error,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isCurrentUserProfile(value: unknown): value is CurrentUserProfile {
  return (
    isRecord(value) &&
    isNonEmptyString(value.userId) &&
    isNonEmptyString(value.displayName) &&
    USER_ACCOUNT_STATUSES.some((status) => status === value.accountStatus) &&
    isNonEmptyString(value.createdAt) &&
    isNonEmptyString(value.lastSignedInAt)
  );
}

function isUserSession(value: unknown): value is UserSession {
  return (
    isRecord(value) &&
    isNonEmptyString(value.accessToken) &&
    isCurrentUserProfile(value.user) &&
    typeof value.isNewUser === 'boolean'
  );
}
