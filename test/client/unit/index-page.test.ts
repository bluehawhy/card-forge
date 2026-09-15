import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Image } from 'react-native';
import { HomePage } from '../../../pages';
import { configureTestRuntime } from './game-runtime.fixture';

jest.mock('@apps-in-toss/framework', () => ({
  getOperationalEnvironment: jest.fn(() => 'sandbox'),
  getUserKeyForGame: jest.fn(() =>
    Promise.resolve({ type: 'HASH', hash: 'test-user-hash' }),
  ),
}));
jest.mock('lucide-react-native', () => ({ Settings: () => null }));
jest.mock('react-native-svg', () => ({ SvgUri: () => null }));

const mockNavigate = jest.fn();
jest.mock('@granite-js/react-native', () => ({
  createRoute: jest.fn(),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

beforeEach(async () => {
  jest.useFakeTimers();
  mockNavigate.mockClear();
  await configureTestRuntime();
});

async function finishInitialLoading(screen: ReturnType<typeof render>) {
  await act(async () => {
    await Promise.resolve();
  });
  fireEvent(screen.UNSAFE_getByType(Image), 'loadEnd');
  act(() => jest.advanceTimersByTime(5_000));
}

it('카드 도감은 인덱스 내부 로딩 대신 별도 로딩 경로로 이동한다', async () => {
  const screen = render(React.createElement(HomePage));
  await finishInitialLoading(screen);

  fireEvent.press(screen.getByLabelText('카드 도감 이동'));
  expect(mockNavigate).toHaveBeenCalledWith('/card_collection_loading');
});

afterEach(() => jest.useRealTimers());

it('빠른 이동 라벨 없이 주요 메뉴와 사용자 정보를 표시한다', async () => {
  const screen = render(React.createElement(HomePage));
  await finishInitialLoading(screen);
  expect(screen.queryByText('빠른 이동')).toBeNull();
  expect(screen.getByText('카드 보관함')).toBeTruthy();
  expect(screen.getByText('카드 강화소')).toBeTruthy();
  expect(screen.getByText('카드 상점')).toBeTruthy();
  expect(screen.getByText('포인트 교환소')).toBeTruthy();
  expect(screen.getByText('카드 도감')).toBeTruthy();
  const menuLabels = screen
    .getAllByRole('button')
    .map((button) => button.props.accessibilityLabel)
    .filter((label) => label?.endsWith('이동'));
  expect(menuLabels).toEqual([
    '카드 상점 이동',
    '카드 보관함 이동',
    '카드 강화소 이동',
    '포인트 교환소 이동',
    '카드 도감 이동',
  ]);
  expect(screen.queryByText('검은 재')).toBeNull();
  fireEvent.press(screen.getByLabelText('카드 보관함 이동'));
  expect(mockNavigate).toHaveBeenCalledWith('/card-storage');
  fireEvent.press(screen.getByLabelText('카드 상점 이동'));
  expect(mockNavigate).toHaveBeenCalledWith('/packs');
  fireEvent.press(screen.getByLabelText('카드 도감 이동'));
  expect(mockNavigate).toHaveBeenCalledWith('/card_collection_loading');
});
