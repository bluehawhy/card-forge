export interface GameUserIdentityProvider {
  getGameUserHash(): Promise<string>;
}
