import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Animated } from 'react-native';
import { ForgePage } from '../../../pages/forge';
import { gameCache } from '../../../src/features/game-cache';
import { rewardedAdService } from '../../../src/services/rewardedAdService';
import { appLogger } from '../../../src/utils/appLogger';
import { configureTestRuntime, findTestCard } from './game-runtime.fixture';

jest.mock('@granite-js/react-native', () => ({
  createRoute: jest.fn(() => ({})),
}));
jest.mock('../../../src/services/rewardedAdService', () => ({
  rewardedAdService: { load: jest.fn(), show: jest.fn() },
  isRewardedAdSuccess: jest.fn(() => true),
}));
const load = jest.mocked(rewardedAdService.load);
const show = jest.mocked(rewardedAdService.show);

beforeEach(async () => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  appLogger.clear();
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
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('선택한 카드 아래에 다음 강화 단계 문구를 표시하지 않는다', () => {
  const screen = render(React.createElement(ForgePage));
  fireEvent.press(screen.getByLabelText('물 레어 3강 카드 선택'));
  expect(screen.queryByText('3강 → 4강')).toBeNull();
});

it('원하는 카드 한 장을 강화하고 캐시의 해당 카드만 갱신한다', async () => {
  const screen = render(React.createElement(ForgePage));
  fireEvent.press(screen.getByLabelText('땅 노말 1강 카드 선택'));
  fireEvent.press(screen.getByLabelText('강화 시도'));
  await waitFor(() =>
    expect(screen.getByText('여기는 배너광고 위젯입니다')).toBeTruthy(),
  );
  expect(screen.getByLabelText('강화용 망치')).toBeTruthy();
  expect(screen.getByLabelText('강화용 모루')).toBeTruthy();
  expect(screen.queryByText('강화 성공!')).toBeNull();

  await act(async () => {
    jest.advanceTimersByTime(4_999);
    await Promise.resolve();
  });
  expect(screen.getByLabelText('카드 강화 중, 모루 타격 3/3')).toBeTruthy();
  expect(screen.queryByText('강화 성공!')).toBeNull();

  await act(async () => {
    jest.advanceTimersByTime(1);
    await Promise.resolve();
  });
  await waitFor(() => expect(screen.getByText('강화 성공!')).toBeTruthy());
  expect(
    gameCache.getSnapshot().cards.find((card) => card.cardId === 'card-earth')
      ?.enhancementLevel,
  ).toBe(2);
  expect(
    gameCache.getSnapshot().cards.find((card) => card.cardId === 'card-water')
      ?.enhancementLevel,
  ).toBe(3);
});

it('강화 실패를 잠금 상태로 캐시에 반영한다', async () => {
  await configureTestRuntime({
    enhanceCard: async ({ cardId }) => ({
      result: 'FAILURE',
      card: {
        ...findTestCard(cardId),
        status: 'ENHANCEMENT_LOCKED',
      },
    }),
  });
  const screen = render(React.createElement(ForgePage));
  fireEvent.press(screen.getByLabelText('물 레어 3강 카드 선택'));
  fireEvent.press(screen.getByLabelText('강화 시도'));
  await waitFor(() =>
    expect(screen.getByText('여기는 배너광고 위젯입니다')).toBeTruthy(),
  );
  await act(async () => {
    jest.advanceTimersByTime(5_000);
    await Promise.resolve();
  });
  await waitFor(() => expect(screen.getByText('강화 실패')).toBeTruthy());
  expect(
    gameCache.getSnapshot().cards.find((card) => card.cardId === 'card-water')
      ?.status,
  ).toBe('ENHANCEMENT_LOCKED');
});

it('이미 잠긴 카드의 서버 오류를 로그와 안내 문구에 구체적으로 남긴다', async () => {
  await configureTestRuntime({
    enhanceCard: async () =>
      Promise.reject(new Error('ENHANCEMENT_PERMANENTLY_LOCKED')),
  });
  const screen = render(React.createElement(ForgePage));
  fireEvent.press(screen.getByLabelText('땅 노말 1강 카드 선택'));
  fireEvent.press(screen.getByText('no ad'));
  fireEvent.press(screen.getByLabelText('강화 시도'));

  await waitFor(() =>
    expect(screen.getByText('이미 강화 실패로 잠긴 카드예요.')).toBeTruthy(),
  );
  expect(appLogger.getText()).toContain(
    '강화 처리 실패 | {"cardId":"card-earth","enhancementLevel":1,"devRewardedAdMode":"NO_AD","code":"ENHANCEMENT_PERMANENTLY_LOCKED"',
  );
});
