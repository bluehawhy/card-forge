export const ENHANCEMENT_RATE_VERSION = 'enhancement-v1';
export const ENHANCEMENT_RATES = [
  { success: 1, destroy: 0 },
  { success: 1, destroy: 0 },
  { success: 0.9, destroy: 0 },
  { success: 0.75, destroy: 0 },
  { success: 0.6, destroy: 0.1 },
  { success: 0.5, destroy: 0.15 },
  { success: 0.4, destroy: 0.2 },
  { success: 0.35, destroy: 0.25 },
  { success: 0.3, destroy: 0.3 },
  { success: 0.25, destroy: 0.35 },
] as const;

// GAME_RULES.md에서 아직 확정되지 않은 값이다. 확정 전까지 강화 실행을 막는다.
export const ENHANCEMENT_COIN_COSTS: readonly number[] | null = null;
export const DESTRUCTION_ASH_REWARDS: readonly number[] | null = null;
