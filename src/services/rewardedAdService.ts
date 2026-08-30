import {
  type LoadFullScreenAdParams,
  type ShowFullScreenAdParams,
  loadFullScreenAd,
  showFullScreenAd,
} from '@apps-in-toss/framework';

export const REWARDED_AD_TEST_ID = 'ait-ad-test-rewarded-id';

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
}

export class RewardedAdService {
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

    return new Promise((resolve, reject) => {
      let unregister = () => {};
      unregister = this.gateway.load({
        options: { adGroupId: REWARDED_AD_TEST_ID },
        onEvent: (event) => {
          if (event.type === 'loaded') {
            unregister();
            resolve();
          }
        },
        onError: (error) => {
          unregister();
          reject(error);
        },
      });
    });
  }

  show(): Promise<RewardedAdResult> {
    if (!this.isSupported()) {
      return Promise.reject(new Error('REWARDED_AD_NOT_SUPPORTED'));
    }

    return new Promise((resolve, reject) => {
      let rewarded = false;
      let unregister = () => {};
      unregister = this.gateway.show({
        options: { adGroupId: REWARDED_AD_TEST_ID },
        onEvent: (event) => {
          if (event.type === 'userEarnedReward') {
            rewarded = true;
            unregister();
            resolve(event.data);
          } else if (event.type === 'failedToShow') {
            unregister();
            reject(new Error('REWARDED_AD_FAILED_TO_SHOW'));
          } else if (event.type === 'dismissed' && !rewarded) {
            unregister();
            reject(new Error('REWARDED_AD_DISMISSED_WITHOUT_REWARD'));
          }
        },
        onError: (error) => {
          unregister();
          reject(error);
        },
      });
    });
  }
}

export const rewardedAdService = new RewardedAdService();
