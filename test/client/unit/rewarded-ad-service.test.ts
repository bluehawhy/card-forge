jest.mock('@apps-in-toss/framework', () => ({
  loadFullScreenAd: Object.assign(jest.fn(), {
    isSupported: jest.fn(() => true),
  }),
  showFullScreenAd: Object.assign(jest.fn(), {
    isSupported: jest.fn(() => true),
  }),
}));

import {
  REWARDED_AD_TEST_ID,
  RewardedAdService,
} from '../../../src/services/rewardedAdService';

function createGateway() {
  return {
    isLoadSupported: jest.fn(() => true),
    isShowSupported: jest.fn(() => true),
    load: jest.fn(() => jest.fn()),
    show: jest.fn(() => jest.fn()),
  };
}

describe('RewardedAdService', () => {
  it('공식 보상형 테스트 ID로 광고를 로드한다', async () => {
    const gateway = createGateway();
    gateway.load.mockImplementation(({ onEvent }) => {
      onEvent({ type: 'loaded' });
      return jest.fn();
    });
    const service = new RewardedAdService(gateway);

    await service.load();

    expect(gateway.load).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { adGroupId: REWARDED_AD_TEST_ID },
      }),
    );
  });

  it('userEarnedReward 이벤트가 발생해야만 보상을 반환한다', async () => {
    const gateway = createGateway();
    gateway.show.mockImplementation(({ onEvent }) => {
      onEvent({
        type: 'userEarnedReward',
        data: { unitType: 'card', unitAmount: 1 },
      });
      return jest.fn();
    });
    const service = new RewardedAdService(gateway);

    await expect(service.show()).resolves.toEqual({
      unitType: 'card',
      unitAmount: 1,
    });
  });

  it('보상 없이 광고를 닫으면 지급을 거절한다', async () => {
    const gateway = createGateway();
    gateway.show.mockImplementation(({ onEvent }) => {
      onEvent({ type: 'dismissed' });
      return jest.fn();
    });
    const service = new RewardedAdService(gateway);

    await expect(service.show()).rejects.toThrow(
      'REWARDED_AD_DISMISSED_WITHOUT_REWARD',
    );
  });
});
