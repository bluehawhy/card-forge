export const USER_ACCOUNT_STATUSES = [
  'ACTIVE',
  'SUSPENDED',
  'WITHDRAWN',
] as const;

export type UserAccountStatus = (typeof USER_ACCOUNT_STATUSES)[number];

export interface CurrentUserProfile {
  userId: string;
  displayName: string;
  accountStatus: UserAccountStatus;
  createdAt: string;
  lastSignedInAt: string;
}

export interface UserSession {
  accessToken: string;
  user: CurrentUserProfile;
  isNewUser: boolean;
}

export interface UpdateCurrentUserProfileInput {
  displayName: string;
}
