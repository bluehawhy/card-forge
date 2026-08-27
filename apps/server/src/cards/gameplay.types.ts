export const GAME_REPOSITORY = Symbol('GAME_REPOSITORY');

export type Element = 'FIRE' | 'WATER' | 'EARTH' | 'WIND' | 'LIGHT' | 'DARK';
export type Grade =
  | 'NORMAL'
  | 'MAGIC'
  | 'RARE'
  | 'SUPER_RARE'
  | 'UNIQUE'
  | 'LEGENDARY';
export type PackType = 'FREE' | 'AD';
export type EnhancementResult = 'SUCCESS' | 'FAILURE' | 'DESTROYED';

export interface PackAvailability {
  packType: PackType;
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  nextResetAt: string;
}

export interface OwnedCard {
  cardId: string;
  templateId: string;
  name: string;
  element: Element;
  grade: Grade;
  imageKey: string;
  enhancementLevel: number;
  status: 'OWNED' | 'DESTROYED' | 'SOLD';
  acquiredAt: string;
}

export interface CardSaleResult {
  cardId: string;
  enhancementLevel: number;
  crystalReward: number;
  crystalBalance: number;
  replayed: boolean;
}

export interface GameRepository {
  listCards(tokenDigest: string): Promise<OwnedCard[] | null>;
  getCard(
    tokenDigest: string,
    cardId: string,
  ): Promise<OwnedCard | null | undefined>;
  sellCard(input: {
    tokenDigest: string;
    requestId: string;
    cardId: string;
  }): Promise<CardSaleResult>;
  getPackAvailability(
    tokenDigest: string,
    packType: PackType,
  ): Promise<PackAvailability | null>;
  openPack(input: {
    tokenDigest: string;
    requestId: string;
    packType: PackType;
    element: Element;
    grade: Grade;
    probabilityVersion: string;
  }): Promise<{ card: OwnedCard; replayed: boolean }>;
  enhance(input: {
    tokenDigest: string;
    requestId: string;
    cardId: string;
    expectedLevel: number;
    result: EnhancementResult;
    coinCost: number;
    ashReward: number;
    probabilityVersion: string;
  }): Promise<{
    card: OwnedCard | null;
    result: EnhancementResult;
    replayed: boolean;
  }>;
  exchange(input: {
    tokenDigest: string;
    requestId: string;
    pointAmount: number;
    crystalAmount: number;
  }): Promise<{
    exchangeId: string;
    pointAmount: number;
    crystalAmount: number;
    status: string;
    replayed: boolean;
  }>;
  recordAudit(input: {
    tokenDigest?: string;
    eventType: string;
    requestId?: string;
    details?: Record<string, unknown>;
  }): Promise<void>;
}
