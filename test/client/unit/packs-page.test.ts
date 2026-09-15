import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Animated } from 'react-native';
import { PacksPage } from '../../../pages/packs';
import { gameCache } from '../../../src/features/game-cache';
import { rewardedAdService } from '../../../src/services/rewardedAdService';
import { clearRewardedAdCooldown } from '../../../src/services/rewardedAdCooldown';
import {
  configureTestRuntime,
  initialGameSnapshot,
} from './game-runtime.fixture';

jest.mock('@granite-js/react-native', () => ({ createRoute: jest.fn() }));
jest.mock('../../../src/services/rewardedAdService', () => ({
  rewardedAdService: { load: jest.fn(), show: jest.fn() },
  isRewardedAdSuccess: jest.fn(() => true),
}));
const load = jest.mocked(rewardedAdService.load);
const show = jest.mocked(rewardedAdService.show);
beforeEach(async () => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  clearRewardedAdCooldown();
  await configureTestRuntime();
  load.mockResolvedValue(undefined);
  show.mockResolvedValue({
    unitType: 'card',
    unitAmount: 1,
    completionId: 'proof-1234',
  });
  jest.spyOn(Animated, 'sequence').mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
  });
});
afterEach(() => {
  clearRewardedAdCooldown();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('광고 완료 후 카드팩 결과를 캐시에 추가하고 화면에 표시한다', async () => {
  const screen = render(React.createElement(PacksPage));
  expect(
    screen.getByText('광고 시청 완료 후 카드 1장을 뽑아요 (3/5)'),
  ).toBeTruthy();
  fireEvent.press(screen.getByLabelText('카드 뽑기'));
  await waitFor(() =>
    expect(screen.getByText('원소의 힘이 모이고 있어요…')).toBeTruthy(),
  );
  expect(screen.getByText('여기는 배너광고 위젯입니다')).toBeTruthy();
  expect(screen.queryByText('카드 당첨!')).toBeNull();

  await act(async () => {
    jest.advanceTimersByTime(4_999);
    await Promise.resolve();
  });
  expect(screen.queryByText('카드 당첨!')).toBeNull();

  await act(async () => {
    jest.advanceTimersByTime(1);
    await Promise.resolve();
  });
  await waitFor(() => expect(screen.getByText('카드 당첨!')).toBeTruthy());
  expect(gameCache.getSnapshot().cards).toHaveLength(4);
  expect(screen.getByText('바람의 궁수')).toBeTruthy();
  expect(screen.getByText('노말')).toBeTruthy();
  expect(screen.getByText('1강')).toBeTruthy();
  expect(screen.getByText('바람 원소')).toBeTruthy();
});

it('광고 중단 시 캐시를 변경하지 않는다', async () => {
  show.mockRejectedValueOnce(new Error('REWARDED_AD_DISMISSED_WITHOUT_REWARD'));
  const screen = render(React.createElement(PacksPage));
  fireEvent.press(screen.getByLabelText('카드 뽑기'));
  await waitFor(() =>
    expect(
      screen.getByText('광고를 끝까지 시청해야 카드를 뽑을 수 있어요.'),
    ).toBeTruthy(),
  );
  expect(gameCache.getSnapshot().cards).toHaveLength(3);
});

it('카드가 5장이면 뽑기 버튼을 회색 비활성 상태로 표시한다', async () => {
  await configureTestRuntime({
    loadGame: async () => ({
      ...initialGameSnapshot,
      cards: [
        ...initialGameSnapshot.cards,
        { ...initialGameSnapshot.cards[0], cardId: 'card-earth-2' },
        { ...initialGameSnapshot.cards[1], cardId: 'card-water-2' },
      ],
      packAvailability: {
        ...initialGameSnapshot.packAvailability,
        ownedCardCount: 5,
        storageFull: true,
      },
    }),
  });

  const screen = render(React.createElement(PacksPage));
  const button = screen.getByLabelText('카드 뽑기');

  expect(screen.getByText('카드가 가득 찼습니다.')).toBeTruthy();
  expect(button.props.accessibilityState.disabled).toBe(true);
  fireEvent.press(button);
  expect(load).not.toHaveBeenCalled();
});
