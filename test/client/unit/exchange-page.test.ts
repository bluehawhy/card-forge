import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import { ExchangePage } from '../../../pages/exchange';
import { gameCache } from '../../../src/features/game-cache';
import { rewardedAdService } from '../../../src/services/rewardedAdService';
import { clearRewardedAdCooldown } from '../../../src/services/rewardedAdCooldown';
import { configureTestRuntime } from './game-runtime.fixture';

jest.mock('@granite-js/react-native', () => ({ createRoute: jest.fn() }));
jest.mock('lucide-react-native', () => ({
  SquareCheckBig: () => null,
  SquareMinus: () => null,
}));
jest.mock('../../../src/services/rewardedAdService', () => ({
  rewardedAdService: { load: jest.fn(), show: jest.fn() },
  isRewardedAdSuccess: jest.fn(() => true),
}));

beforeEach(async () => {
  jest.clearAllMocks();
  clearRewardedAdCooldown();
  await configureTestRuntime();
  jest.mocked(rewardedAdService.load).mockResolvedValue(undefined);
  jest.mocked(rewardedAdService.show).mockResolvedValue({
    unitType: 'card',
    unitAmount: 1,
    completionId: 'proof-1234',
  });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  clearRewardedAdCooldown();
  jest.restoreAllMocks();
});

it('카드 행의 등급색 광원은 내부를 가리고 테두리 밖에 표시한다', () => {
  const screen = render(React.createElement(ExchangePage));
  const rareCard = screen.getByLabelText('물 레어 3강');

  expect(StyleSheet.flatten(rareCard.props.style)).toMatchObject({
    borderColor: '#72B6FF',
    borderWidth: 1,
  });
  expect(rareCard.findByProps({ testID: 'exchange-card-aura-mask' })).toBeTruthy();
  expect(
    StyleSheet.flatten(
      rareCard.findByProps({ testID: 'grade-color-wide-glow' }).props.style,
    ),
  ).toMatchObject({
    shadowRadius: 11.2,
    shadowOpacity: 0,
    elevation: 0,
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 11.2,
        color: 'rgba(114, 182, 255, 0.77)',
      },
    ],
  });
  expect(
    StyleSheet.flatten(
      rareCard.findByProps({ testID: 'grade-color-core-glow' }).props.style,
    ),
  ).toMatchObject({
    shadowRadius: 5.6,
    shadowOpacity: 0,
    elevation: 0,
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 5.6,
        color: 'rgba(114, 182, 255, 0.49)',
      },
    ],
  });
});

it('선택한 1~5장만 판매하고 결정과 보관함을 캐시에 반영한다', async () => {
  const screen = render(React.createElement(ExchangePage));
  fireEvent.press(screen.getByLabelText('땅 노말 1강'));
  fireEvent.press(screen.getByLabelText('물 레어 3강'));
  fireEvent.press(screen.getByText('선택 카드 판매'));
  await waitFor(() => expect(gameCache.getSnapshot().cards).toHaveLength(1));
  expect(gameCache.getSnapshot().crystalBalance).toBe(1_100_000);
  expect(screen.getByText('0장 선택')).toBeTruthy();
});

it('보유 카드를 전체 선택하고 같은 버튼으로 모두 선택 해제한다', async () => {
  const screen = render(React.createElement(ExchangePage));

  fireEvent.press(screen.getByLabelText('카드 전체 선택'));
  expect(screen.getByText('3장 선택')).toBeTruthy();
  expect(screen.getByLabelText('카드 전체 선택 해제')).toBeTruthy();
  expect(screen.getByText('1,000,000')).toBeTruthy();

  fireEvent.press(screen.getByLabelText('카드 전체 선택 해제'));
  expect(screen.getByText('0장 선택')).toBeTruthy();
  expect(screen.getByLabelText('카드 전체 선택')).toBeTruthy();
});

it('보유 결정을 포인트로 교환하면 캐시 잔액이 감소한다', async () => {
  const screen = render(React.createElement(ExchangePage));
  fireEvent.press(screen.getByText('결정 → 포인트'));
  fireEvent.changeText(screen.getByLabelText('교환할 결정 수량'), '20000');
  fireEvent.press(screen.getByText('포인트로 교환'));
  await waitFor(() =>
    expect(gameCache.getSnapshot().crystalBalance).toBe(980_000),
  );
  expect(screen.getByText('보유 결정 980,000개')).toBeTruthy();
});
