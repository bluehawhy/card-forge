import React from 'react';
import {
  Image,
  type ImageSourcePropType,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type {
  CachedOwnedCard,
  CardGrade,
} from '../features/game-cache/gameCache';
import {
  getCardImage,
  gradeLabels,
} from '../features/game-cache/gamePresentation';
import { MaxLevelAura } from './max-level-aura';

export const cardOutlineColors: Record<CardGrade, string> = {
  NORMAL: '#AAB2BD',
  MAGIC: '#76CFA3',
  RARE: '#72B6FF',
  SUPER_RARE: '#C497FF',
  UNIQUE: '#FFAF72',
  LEGENDARY: '#FFE080',
};

/** 160px 재사용 카드 위젯 전용 오라 값입니다. */
const reusableCardAura = {
  regular: {
    uniformShadow: true,
    wideBlurRadius: 22,
    coreBlurRadius: 12,
    wideElevation: 11,
    coreElevation: 8,
    spreadScale: 1.015,
    wideOpacity: 0.78,
    coreOpacity: 0.62,
  },
  maxLevel: {
    uniformShadow: true,
    wideBlurRadius: 34,
    coreBlurRadius: 18,
    wideElevation: 18,
    coreElevation: 14,
    spreadScale: 1.025,
    wideOpacity: 1,
    coreOpacity: 0.92,
  },
} as const;

export interface CardProps {
  card: Pick<CachedOwnedCard, 'name' | 'grade' | 'imageKey' | 'enhancementLevel'>;
  /** Supabase URL은 { uri: url }, 로컬 이미지는 require(...)로 전달합니다. */
  imageSource?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
}

/** DB/API에서 받은 카드 정보를 표시하는 재사용 위젯입니다. */
export function Card({ card, imageSource, style }: CardProps) {
  const outlineColor = cardOutlineColors[card.grade];
  const source = imageSource ?? getCardImage(card.imageKey);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${card.name}, ${gradeLabels[card.grade]}, 강화 ${card.enhancementLevel}`}
      style={[styles.card, styles.auraCard, style]}
    >
      <MaxLevelAura
        level={card.enhancementLevel}
        borderRadius={14}
        color={outlineColor}
        {...(card.enhancementLevel >= 10
          ? reusableCardAura.maxLevel
          : reusableCardAura.regular)}
      />
      <Image source={source} style={styles.image} resizeMode="cover" />
      <View style={[styles.footer, { borderTopColor: outlineColor }]}>
        <Text style={[styles.grade, { color: outlineColor }]}>
          {gradeLabels[card.grade]}
        </Text>
        <Text style={styles.enhancement}>강화 +{card.enhancementLevel}</Text>
      </View>
    </View>
  );
}

export default Card;

const styles = StyleSheet.create({
  card: {
    width: 160,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#151C2C',
  },
  auraCard: { overflow: 'visible' },
  image: {
    width: '100%',
    aspectRatio: 5 / 7,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 4,
    borderTopWidth: 1,
  },
  grade: {
    fontSize: 11,
    fontWeight: '600',
  },
  enhancement: {
    color: '#F4F7FC',
    fontSize: 16,
    fontWeight: '700',
  },
});
