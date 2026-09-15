import { render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { MaxLevelAura } from '../../../src/components/max-level-aura';

it('10강은 금색 오로라, 나머지는 전달받은 등급색 오로라를 표시한다', () => {
  const screen = render(
    React.createElement(MaxLevelAura, { level: 9, color: '#72B6FF' }),
  );
  expect(screen.getByTestId('grade-color-aura')).toBeTruthy();
  expect(screen.getByTestId('grade-color-wide-glow')).toBeTruthy();
  expect(screen.getByTestId('grade-color-core-glow')).toBeTruthy();
  expect(screen.queryByTestId('max-level-gold-aura')).toBeNull();

  screen.rerender(
    React.createElement(MaxLevelAura, { level: 10, color: '#72B6FF' }),
  );
  expect(screen.getByTestId('max-level-gold-aura')).toBeTruthy();
  expect(screen.getByTestId('max-level-gold-wide-glow')).toBeTruthy();
  expect(screen.getByTestId('max-level-gold-core-glow')).toBeTruthy();
  expect(screen.queryByTestId('grade-color-aura')).toBeNull();
});

it('등급색이 없는 10강 미만 카드는 오로라를 표시하지 않는다', () => {
  const screen = render(React.createElement(MaxLevelAura, { level: 9 }));
  expect(screen.toJSON()).toBeNull();
});

it('작은 카드에서는 오로라의 블러 반경을 비례해서 줄인다', () => {
  const screen = render(
    React.createElement(MaxLevelAura, {
      level: 3,
      color: '#72B6FF',
      blurScale: 0.45,
    }),
  );

  expect(
    StyleSheet.flatten(screen.getByTestId('grade-color-wide-glow').props.style)
      .shadowRadius,
  ).toBeCloseTo(9.9);
  expect(
    StyleSheet.flatten(screen.getByTestId('grade-color-core-glow').props.style)
      .shadowRadius,
  ).toBeCloseTo(5.4);
});
