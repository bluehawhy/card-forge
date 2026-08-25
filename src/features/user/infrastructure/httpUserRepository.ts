import type {
  CurrentUserProfile,
  UpdateCurrentUserProfileInput,
  UserSession,
} from '../domain/user';
import { UserError } from '../domain/userError';
import type { UserRepository } from '../ports/userRepository';

export interface HttpUserRepositoryOptions {
  apiBaseUrl: string;
  fetchImplementation?: typeof fetch;
}

interface ErrorResponseBody {
  message?: string;
}

export function createHttpUserRepository({
  apiBaseUrl,
  fetchImplementation = fetch,
}: HttpUserRepositoryOptions): UserRepository {
  const normalizedApiBaseUrl = apiBaseUrl.replace(/\/$/, '');

  async function requestJson<ResponseBody>(
    path: string,
    requestInit: RequestInit,
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
      const errorMessage =
        isErrorResponseBody(responseBody) &&
        typeof responseBody.message === 'string'
          ? responseBody.message
          : `회원 API 요청에 실패했습니다. (${response.status})`;

      throw new UserError('USER_API_REQUEST_FAILED', errorMessage);
    }

    if (responseBody === null) {
      throw new UserError(
        'USER_API_REQUEST_FAILED',
        '회원 API 응답 본문이 비어 있습니다.',
      );
    }

    return responseBody as ResponseBody;
  }

  return {
    initializeUserSession(tossGameUserHash: string): Promise<UserSession> {
      return requestJson<UserSession>('/api/v1/user-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tossGameUserHash }),
      });
    },

    getCurrentUser(accessToken: string): Promise<CurrentUserProfile> {
      return requestJson<CurrentUserProfile>('/api/v1/users/me', {
        method: 'GET',
        headers: createAuthorizedHeaders(accessToken),
      });
    },

    updateCurrentUserProfile(
      accessToken: string,
      profileInput: UpdateCurrentUserProfileInput,
    ): Promise<CurrentUserProfile> {
      return requestJson<CurrentUserProfile>('/api/v1/users/me', {
        method: 'PATCH',
        headers: createAuthorizedHeaders(accessToken),
        body: JSON.stringify(profileInput),
      });
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

function isErrorResponseBody(
  responseBody: unknown,
): responseBody is ErrorResponseBody {
  return (
    typeof responseBody === 'object' &&
    responseBody !== null &&
    'message' in responseBody
  );
}
