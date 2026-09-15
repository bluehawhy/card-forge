import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { CardStoragePage } from '../../../pages/card-storage';
import { gameCache } from '../../../src/features/game-cache';
import {
  configureTestRuntime,
  findTestCard,
  initialGameSnapshot,
} from './game-runtime.fixture';

const mockNavigate = jest.fn();
jest.mock('@granite-js/react-native', () => ({
  createRoute: jest.fn(),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

beforeEach(async () => {
  mockNavigate.mockClear();
  await configureTestRuntime();
});

it('캐시의 보유 카드를 표시하고 캐시 변경에 즉시 반응한다', () => {
  const screen = render(React.createElement(CardStoragePage));
  expect(screen.getByText('3장')).toBeTruthy();
  act(() => {
    gameCache.replaceFromServer({
      ...gameCache.getSnapshot(),
      cards: [
        ...gameCache.getSnapshot().cards,
        {
          ...findTestCard('card-earth'),
          cardId: 'card-wind',
          name: '바람의 궁수',
          element: 'WIND',
        },
      ],
      packAvailability: {
        ...initialGameSnapshot.packAvailability,
        ownedCardCount: 4,
      },
    });
  });
  expect(screen.getByText('4장')).toBeTruthy();
  expect(screen.getByText('바람의 궁수')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('땅 노말 1강 카드 상세 보기'));
  expect(mockNavigate).toHaveBeenCalledWith('/card-detail', {
    id: 'card-earth',
  });
});

it('카드 보관함의 등급 광원은 카드 내부를 덮지 않고 외부 그림자로 표시한다', () => {
  const screen = render(React.createElement(CardStoragePage));
  const rareCard = screen.getByLabelText('물 레어 3강 카드');

  expect(StyleSheet.flatten(rareCard.props.style)).toMatchObject({
    borderColor: '#72B6FF',
    shadowColor: '#72B6FF',
    shadowOpacity: 0,
    elevation: 0,
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 8,
        color: 'rgba(114, 182, 255, 0.42)',
      },
    ],
  });
  expect(rareCard.findAllByProps({ testID: 'grade-color-aura' })).toHaveLength(
    0,
  );
});
