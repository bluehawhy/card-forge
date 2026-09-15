export const REWARDED_AD_COOLDOWN_MS = 20_000;

let cooldownUntil = 0;
let expiryTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

export function getRewardedAdCooldownSeconds(now = Date.now()): number {
  return Math.max(0, Math.ceil((cooldownUntil - now) / 1_000));
}

export function isRewardedAdCooldownActive(now = Date.now()): boolean {
  return cooldownUntil > now;
}

export function startRewardedAdCooldown(now = Date.now()): void {
  cooldownUntil = now + REWARDED_AD_COOLDOWN_MS;
  if (expiryTimer !== null) clearTimeout(expiryTimer);
  expiryTimer = setTimeout(() => {
    cooldownUntil = 0;
    expiryTimer = null;
    emit();
  }, REWARDED_AD_COOLDOWN_MS);
  emit();
}

export function clearRewardedAdCooldown(): void {
  cooldownUntil = 0;
  if (expiryTimer !== null) clearTimeout(expiryTimer);
  expiryTimer = null;
  emit();
}

export function subscribeRewardedAdCooldown(
  listener: () => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(): void {
  for (const listener of listeners) listener();
}
