import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { HomePage } from '../../../pages';
import {
  INVALID_ACCESS_ERROR_CODE,
  gameCache,
} from '../../../src/features/game-cache';

const mockNavigate = jest.fn();
jest.mock('@granite-js/react-native', () => ({
  createRoute: jest.fn(),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

beforeEach(() => {
  mockNavigate.mockClear();
  gameCache.clear();
  gameCache.setCurrentUser({
    userId: 'user-001',
    displayName: '모험가',
    accountStatus: 'ACTIVE',
    createdAt: '2026-09-11T00:00:00.000Z',
    lastSignedInAt: '2026-09-11T00:00:00.000Z',
  });
});

afterEach(() => gameCache.clear());

it('빠른 이동 라벨 없이 주요 메뉴와 사용자 정보를 표시한다', () => {
  const screen = render(React.createElement(HomePage));
  expect(screen.queryByText('빠른 이동')).toBeNull();
  expect(screen.getByText('카드 보관함')).toBeTruthy();
  expect(screen.getByText('카드 강화소')).toBeTruthy();
  expect(screen.getByText('카드 상점')).toBeTruthy();
  expect(screen.getByText('포인트 교환소')).toBeTruthy();
  expect(screen.queryByText('검은 재')).toBeNull();
  fireEvent.press(screen.getByLabelText('카드 상점 이동'));
  expect(mockNavigate).toHaveBeenCalledWith('/packs');
});

it('사용자 hash를 받지 못하면 잘못된 접근 화면만 표시한다', () => {
  gameCache.clear();
  gameCache.failLoad({
    code: INVALID_ACCESS_ERROR_CODE,
    message: '잘못된 접근입니다.',
  });

  const screen = render(React.createElement(HomePage));

  expect(screen.getByText('잘못된 접근입니다')).toBeTruthy();
  expect(screen.queryByText('카드 보관함')).toBeNull();
});
