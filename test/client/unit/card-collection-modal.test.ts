import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { CardCollectionModal } from '../../../src/components/card-collection-modal';
import type { CachedCollectionEntry } from '../../../src/features/game-cache';

const collection: readonly CachedCollectionEntry[] = [
  {
    templateId: '1',
    name: '대지의 수호자',
    element: 'EARTH',
    grade: 'NORMAL',
    imageKey: 'cards/earth_guardian.png',
    highestEnhancementLevel: 3,
  },
];

it('발견 카드와 미발견 카드를 등급별로 표시한다', () => {
  const screen = render(
    React.createElement(CardCollectionModal, {
      collection,
      onClose: jest.fn(),
      visible: true,
    }),
  );

  expect(screen.getByText('발견 1 / 36')).toBeTruthy();
  expect(screen.getByText('대지의 수호자')).toBeTruthy();
  expect(screen.getByText('발견 완료 · 최고 3강')).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByText('레어').props.style).color).toBe(
    '#72B6FF',
  );
  expect(screen.getAllByText('미발견 카드')).toHaveLength(5);
});

it('원소 탭을 바꾸고 닫기 요청을 전달한다', () => {
  const onClose = jest.fn();
  const screen = render(
    React.createElement(CardCollectionModal, {
      collection,
      onClose,
      visible: true,
    }),
  );

  fireEvent.press(screen.getByLabelText('물 원소 카드 보기'));
  expect(screen.getAllByText('미발견 카드')).toHaveLength(6);

  fireEvent.press(screen.getByLabelText('카드 도감 닫기'));
  expect(onClose).toHaveBeenCalledTimes(1);
});
