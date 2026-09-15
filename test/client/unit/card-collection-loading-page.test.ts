import { act, render } from '@testing-library/react-native';
import React from 'react';
import { CardCollectionLoadingPage } from '../../../pages/card_collection_loading';

const mockReplace = jest.fn();
jest.mock('@granite-js/react-native', () => ({
  createRoute: jest.fn(),
  useNavigation: () => ({ replace: mockReplace }),
}));

beforeEach(() => {
  jest.useFakeTimers();
  mockReplace.mockClear();
});

afterEach(() => jest.useRealTimers());

it('5초 동안 배너가 있는 로딩 화면을 표시한 뒤 도감으로 교체한다', () => {
  const screen = render(React.createElement(CardCollectionLoadingPage));

  expect(screen.getByText('카드 도감으로 이동하는 중…')).toBeTruthy();
  expect(screen.getByText('여기는 배너광고 위젯입니다')).toBeTruthy();
  act(() => jest.advanceTimersByTime(4_999));
  expect(mockReplace).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1));
  expect(mockReplace).toHaveBeenCalledWith('/card_collection');
});

it('뒤로가기로 로딩 경로가 닫히면 도감 이동 타이머도 취소한다', () => {
  const screen = render(React.createElement(CardCollectionLoadingPage));

  screen.unmount();
  act(() => jest.advanceTimersByTime(5_000));
  expect(mockReplace).not.toHaveBeenCalled();
});
