import {
  type LoadFullScreenAdParams,
  type ShowFullScreenAdParams,
  loadFullScreenAd,
  showFullScreenAd,
} from '@apps-in-toss/framework';
import {
  clearRewardedAdCooldown,
  isRewardedAdCooldownActive,
  startRewardedAdCooldown,
} from './rewardedAdCooldown';

/** 이 프로젝트에서 실제 동작이 확인됐던 보상형 전용 테스트 광고 그룹 ID입니다. */
export const REWARDED_AD_TEST_ID = 'ait-ad-test-rewarded-id';
/** 최신 통합 광고 문서의 개발용 광고 그룹 ID입니다. */
export const REWARDED_AD_INTEGRATED_TEST_ID = 'ait.dev.43daa14da3ae487b';

type FullScreenAdGateway = {
  isLoadSupported(): boolean;
  isShowSupported(): boolean;
  load(params: LoadFullScreenAdParams): () => void;
  show(params: ShowFullScreenAdParams): () => void;
};

const appsInTossGateway: FullScreenAdGateway = {
  isLoadSupported: () => loadFullScreenAd.isSupported(),
  isShowSupported: () => showFullScreenAd.isSupported(),
  load: (params) => loadFullScreenAd(params),
  show: (params) => showFullScreenAd(params),
};

export interface RewardedAdResult {
  unitType: string;
  unitAmount: number;
  /** 서버 검증용 식별자가 SDK에서 제공될 때만 존재합니다. */
  completionId?: string;
}

/**
 * 카드 뽑기용 광고 성공 여부 변환기입니다.
 * TODO: 토스 SDK의 실제 리워드 결과 타입을 최종 확정한 뒤 성공 조건으로 교체합니다.
 */
export function isRewardedAdSuccess(_result: RewardedAdResult): boolean {
  return true;
}

export class RewardedAdService {
  private loadedAdGroupId: string | null = null;

  constructor(
    private readonly gateway: FullScreenAdGateway = appsInTossGateway,
  ) {}

  isSupported(): boolean {
    return this.gateway.isLoadSupported() && this.gateway.isShowSupported();
  }

  load(): Promise<void> {
    if (!this.isSupported()) {
      return Promise.reject(new Error('REWARDED_AD_NOT_SUPPORTED'));
    }

    if (isRewardedAdCooldownActive()) {
      return Promise.reject(new Error('REWARDED_AD_COOLDOWN_ACTIVE'));
    }

    this.loadedAdGroupId = null;
    return this.loadWithFallback([
      REWARDED_AD_TEST_ID,
      REWARDED_AD_INTEGRATED_TEST_ID,
    ]).then(() => startRewardedAdCooldown());
  }

  private loadWithFallback(adGroupIds: readonly string[]): Promise<void> {
    const [adGroupId, ...fallbacks] = adGroupIds;
    if (!adGroupId) {
      return Promise.reject(new Error('REWARDED_AD_LOAD_FAILED'));
    }
    return new Promise((resolve, reject) => {
      let unregister = () => {};
      unregister = this.gateway.load({
        options: { adGroupId },
        onEvent: (event) => {
          if (event.type === 'loaded') {
            unregister();
            this.loadedAdGroupId = adGroupId;
            resolve();
          }
        },
        onError: (error) => {
          unregister();
          if (fallbacks.length > 0) {
            this.loadWithFallback(fallbacks).then(resolve, reject);
          } else {
            reject(adError('REWARDED_AD_LOAD_FAILED', error));
          }
        },
      });
    });
  }

  show(devUserEarnedReward?: boolean): Promise<RewardedAdResult> {
    if (!this.isSupported()) {
      return Promise.reject(new Error('REWARDED_AD_NOT_SUPPORTED'));
    }

    return new Promise((resolve, reject) => {
      let reward: RewardedAdResult | undefined;
      let unregister = () => {};
      unregister = this.gateway.show({
        options: { adGroupId: this.loadedAdGroupId ?? REWARDED_AD_TEST_ID },
        onEvent: (event) => {
          if (event.type === 'userEarnedReward') {
            reward = event.data;
          } else if (event.type === 'failedToShow') {
            unregister();
            this.loadedAdGroupId = null;
            clearRewardedAdCooldown();
            reject(new Error('REWARDED_AD_FAILED_TO_SHOW'));
          } else if (event.type === 'dismissed') {
            unregister();
            this.loadedAdGroupId = null;
            const earnedReward = devUserEarnedReward ?? Boolean(reward);
            if (earnedReward) {
              resolve(
                reward ?? {
                  unitType: 'dev-reward',
                  unitAmount: 1,
                },
              );
            } else {
              reject(new Error('REWARDED_AD_DISMISSED_WITHOUT_REWARD'));
            }
          }
        },
        onError: (error) => {
          unregister();
          this.loadedAdGroupId = null;
          clearRewardedAdCooldown();
          reject(adError('REWARDED_AD_SHOW_FAILED', error));
        },
      });
    });
  }
}

export const rewardedAdService = new RewardedAdService();

function adError(code: string, cause: unknown): Error {
  const detail = readableError(cause);
  return new Error(detail ? `${code}: ${detail}` : code);
}

function readableError(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return value == null ? '' : String(value);
}
