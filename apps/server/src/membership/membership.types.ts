export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const TOSS_GAME_USER_VERIFIER = Symbol('TOSS_GAME_USER_VERIFIER');

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN';

export interface UserProfile {
  userId: string;
  displayName: string;
  accountStatus: AccountStatus;
  createdAt: string;
  lastSignedInAt: string;
}

export interface UserSession {
  accessToken: string;
  user: UserProfile;
  isNewUser: boolean;
}

export interface TossGameUserVerifier {
  verify(tossGameUserHash: string): Promise<{ stableUserKey: string }>;
}

export interface UserRepository {
  initializeUser(
    stableUserDigest: string,
    tokenDigest: string,
    expiresAt: Date,
  ): Promise<{ user: UserProfile; isNewUser: boolean }>;
  findUserBySessionToken(tokenDigest: string): Promise<UserProfile | null>;
  updateDisplayName(
    tokenDigest: string,
    displayName: string,
  ): Promise<UserProfile | null>;
  revokeSession(tokenDigest: string): Promise<boolean>;
}
