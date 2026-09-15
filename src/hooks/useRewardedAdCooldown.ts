import { useEffect, useState } from 'react';
import {
  getRewardedAdCooldownSeconds,
  subscribeRewardedAdCooldown,
} from '../services/rewardedAdCooldown';

export function useRewardedAdCooldown() {
  const [cooldownSeconds, setCooldownSeconds] = useState(() =>
    getRewardedAdCooldownSeconds(),
  );

  useEffect(() => {
    const update = () =>
      setCooldownSeconds(getRewardedAdCooldownSeconds());
    update();
    const unsubscribe = subscribeRewardedAdCooldown(update);
    const timer = setInterval(update, 250);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  return {
    cooldownActive: cooldownSeconds > 0,
    cooldownSeconds,
  };
}
