jest.mock('@apps-in-toss/framework', () => ({
  loadFullScreenAd: Object.assign(jest.fn(), {
    isSupported: jest.fn(() => true),
  }),
  showFullScreenAd: Object.assign(jest.fn(), {
    isSupported: jest.fn(() => true),
  }),
}));

import {
  type ShowFullScreenAdParams,
  loadFullScreenAd,
  showFullScreenAd,
} from '@apps-in-toss/framework';
import {
  clearRewardedAdCooldown,
  getRewardedAdCooldownSeconds,
  isRewardedAdCooldownActive,
  REWARDED_AD_COOLDOWN_MS,
} from '../../../src/services/rewardedAdCooldown';
import {
  REWARDED_AD_INTEGRATED_TEST_ID,
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
  beforeEach(() => clearRewardedAdCooldown());
  afterEach(() => clearRewardedAdCooldown());

  it('현재 공식 개발용 보상형 광고 ID를 사용한다', () => {
    expect(REWARDED_AD_TEST_ID).toBe('ait-ad-test-rewarded-id');
  });
  it('기본 서비스가 실제 SDK의 로드·표시 API에 같은 광고 ID를 전달한다', async () => {
    const sdkLoad = jest.mocked(loadFullScreenAd);
    const sdkShow = jest.mocked(showFullScreenAd);
    sdkLoad.mockImplementation(({ onEvent }) => {
      onEvent({ type: 'loaded' });
      return jest.fn();
    });
    sdkShow.mockImplementation(({ onEvent }) => {
      onEvent({
        type: 'userEarnedReward',
        data: { unitType: 'card', unitAmount: 1 },
      });
      onEvent({ type: 'dismissed' });
      return jest.fn();
    });
    const service = new RewardedAdService();
    await service.load();
    await expect(service.show()).resolves.toEqual({
      unitType: 'card',
      unitAmount: 1,
    });
    for (const sdk of [sdkLoad, sdkShow]) {
      expect(sdk).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { adGroupId: REWARDED_AD_TEST_ID },
        }),
      );
    }
  });

  it('광고 미지원 환경에서는 SDK를 호출하거나 보상을 주지 않는다', async () => {
    const gateway = createGateway();
    gateway.isLoadSupported.mockReturnValue(false);
    const service = new RewardedAdService(gateway);
    await expect(service.load()).rejects.toThrow('REWARDED_AD_NOT_SUPPORTED');
    await expect(service.show()).rejects.toThrow('REWARDED_AD_NOT_SUPPORTED');
    expect(gateway.load).not.toHaveBeenCalled();
    expect(gateway.show).not.toHaveBeenCalled();
  });

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
      onEvent({ type: 'dismissed' });
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

  it('개발용 true 선택 시 보상 이벤트 없이도 임시 성공 결과를 반환한다', async () => {
    const gateway = createGateway();
    gateway.show.mockImplementation(({ onEvent }) => {
      onEvent({ type: 'dismissed' });
      return jest.fn();
    });
    const service = new RewardedAdService(gateway);

    await expect(service.show(true)).resolves.toEqual({
      unitType: 'dev-reward',
      unitAmount: 1,
    });
  });

  it('개발용 false 선택 시 실제 보상 이벤트가 와도 지급을 거절한다', async () => {
    const gateway = createGateway();
    gateway.show.mockImplementation(({ onEvent }) => {
      onEvent({
        type: 'userEarnedReward',
        data: { unitType: 'card', unitAmount: 1 },
      });
      onEvent({ type: 'dismissed' });
      return jest.fn();
    });
    const service = new RewardedAdService(gateway);

    await expect(service.show(false)).rejects.toThrow(
      'REWARDED_AD_DISMISSED_WITHOUT_REWARD',
    );
  });

  it('보상 이벤트 후에도 광고가 닫히기 전에는 뽑기를 시작하지 않는다', async () => {
    const gateway = createGateway();
    let emit: ShowFullScreenAdParams['onEvent'] = () => {};
    gateway.show.mockImplementation(({ onEvent }) => {
      emit = onEvent;
      return jest.fn();
    });
    const completed = jest.fn();
    const pending = new RewardedAdService(gateway).show().then(completed);
    emit({
      type: 'userEarnedReward',
      data: { unitType: 'card', unitAmount: 1 },
    });
    await Promise.resolve();
    expect(completed).not.toHaveBeenCalled();
    emit({ type: 'dismissed' });
    await pending;
    expect(completed).toHaveBeenCalledTimes(1);
  });

  it('광고 표시 실패 시 보상을 지급하지 않는다', async () => {
    const gateway = createGateway();
    gateway.show.mockImplementation(({ onEvent }) => {
      onEvent({ type: 'failedToShow' });
      return jest.fn();
    });
    await expect(new RewardedAdService(gateway).show()).rejects.toThrow(
      'REWARDED_AD_FAILED_TO_SHOW',
    );
  });

  it('광고 로드 SDK 오류의 상세 내용을 보존한다', async () => {
    const gateway = createGateway();
    gateway.load.mockImplementation(({ onError }) => {
      onError({ code: 'NO_FILL' });
      return jest.fn();
    });
    await expect(new RewardedAdService(gateway).load()).rejects.toThrow(
      'REWARDED_AD_LOAD_FAILED: {"code":"NO_FILL"}',
    );
  });

  it('보상형 전용 테스트 ID 로드 실패 시 통합 테스트 ID로 한 번 재시도한다', async () => {
    const gateway = createGateway();
    gateway.load
      .mockImplementationOnce(({ onError }) => {
        onError({ code: 1017 });
        return jest.fn();
      })
      .mockImplementationOnce(({ onEvent }) => {
        onEvent({ type: 'loaded' });
        return jest.fn();
      });
    gateway.show.mockImplementation(({ onEvent }) => {
      onEvent({
        type: 'userEarnedReward',
        data: { unitType: 'card', unitAmount: 1 },
      });
      onEvent({ type: 'dismissed' });
      return jest.fn();
    });

    const service = new RewardedAdService(gateway);
    await service.load();
    await service.show();

    expect(gateway.load).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        options: { adGroupId: REWARDED_AD_INTEGRATED_TEST_ID },
      }),
    );
    expect(gateway.show).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { adGroupId: REWARDED_AD_INTEGRATED_TEST_ID },
      }),
    );
  });

  it('광고 흐름 시작 후 모든 광고 서비스 인스턴스가 20초 쿨타임을 공유한다', async () => {
    let now = 1_000;
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
    const gateway = createGateway();
    gateway.load.mockImplementation(({ onEvent }) => {
      onEvent({ type: 'loaded' });
      return jest.fn();
    });
    const first = new RewardedAdService(gateway);
    const second = new RewardedAdService(gateway);

    await first.load();

    expect(getRewardedAdCooldownSeconds()).toBe(20);
    await expect(second.load()).rejects.toThrow(
      'REWARDED_AD_COOLDOWN_ACTIVE',
    );

    now += REWARDED_AD_COOLDOWN_MS;
    expect(isRewardedAdCooldownActive()).toBe(false);
    await expect(second.load()).resolves.toBeUndefined();
    nowSpy.mockRestore();
  });

  it('광고 로드가 끝내 실패하면 공용 쿨타임을 시작하지 않는다', async () => {
    const gateway = createGateway();
    gateway.load.mockImplementation(({ onError }) => {
      onError({ code: 'NO_FILL' });
      return jest.fn();
    });

    await expect(new RewardedAdService(gateway).load()).rejects.toThrow(
      'REWARDED_AD_LOAD_FAILED',
    );
    expect(isRewardedAdCooldownActive()).toBe(false);
  });

});
