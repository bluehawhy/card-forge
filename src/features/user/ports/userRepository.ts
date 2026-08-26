import type {
  CurrentUserProfile,
  UpdateCurrentUserProfileInput,
  UserSession,
} from '../domain/user';

export interface UserRepository {
  initializeUserSession(tossGameUserHash: string): Promise<UserSession>;
  getCurrentUser(accessToken: string): Promise<CurrentUserProfile>;
  updateCurrentUserProfile(
    accessToken: string,
    profileInput: UpdateCurrentUserProfileInput,
  ): Promise<CurrentUserProfile>;
}
