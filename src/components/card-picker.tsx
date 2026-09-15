import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { CachedOwnedCard } from '../features/game-cache/gameCache';
import { elementLabels, gradeLabels } from '../features/game-cache/gamePresentation';
import { CardArtwork } from './card-artwork';

interface CardPickerProps {
  cards: readonly CachedOwnedCard[];
  selectedId: string | null;
  onSelect: (cardId: string) => void;
  disabled?: boolean;
}

const rarityColors: Record<CachedOwnedCard['grade'], string> = {
  NORMAL: '#AAB2BD',
  MAGIC: '#76CFA3',
  RARE: '#72B6FF',
  SUPER_RARE: '#C497FF',
  UNIQUE: '#FFAF72',
  LEGENDARY: '#FFE080',
};

export function CardPicker({
  cards,
  selectedId,
  onSelect,
  disabled = false,
}: CardPickerProps) {
  const visibleCards = cards.slice(0, 5);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>보유 카드 {visibleCards.length}/5</Text>
      {visibleCards.length ? (
        <View style={styles.slots}>
          {visibleCards.map((card) => {
            const selected = card.cardId === selectedId;
            return (
              <TouchableOpacity
                key={card.cardId}
                accessibilityRole="radio"
                accessibilityLabel={`${elementLabels[card.element]} ${gradeLabels[card.grade]} ${card.enhancementLevel}강 카드 선택`}
                accessibilityState={{ selected, checked: selected, disabled }}
                disabled={disabled}
                activeOpacity={0.82}
                onPress={() => onSelect(card.cardId)}
                style={[
                  styles.cardItem,
                  { borderColor: rarityColors[card.grade] },
                  selected && styles.selected,
                  disabled && styles.disabled,
                ]}
              >
                <View
                  style={[
                    styles.rarityBadge,
                    { backgroundColor: rarityColors[card.grade] },
                  ]}
                >
                  <Text style={styles.rarityText}>
                    {gradeLabels[card.grade]}
                  </Text>
                </View>
                <View style={styles.imageWrap}>
                  <CardArtwork
                    imageKey={card.imageKey}
                    thumbnail
                    style={styles.cardImage}
                    resizeMode="contain"
                  />
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>
                      {card.enhancementLevel}강
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardName} numberOfLines={1}>
                  {card.name}
                </Text>
                <Text style={styles.elementText}>
                  {elementLabels[card.element]} 원소
                </Text>
                <Text
                  style={selected ? styles.selectedText : styles.selectText}
                >
                  {selected ? '✓ 선택됨' : '선택'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>아직 보유한 카드가 없어요</Text>
          <Text style={styles.emptyText}>
            카드 상점에서 첫 카드를 뽑아보세요.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: 420, gap: 12 },
  title: { color: '#E4D9C4', fontSize: 14, fontWeight: '700' },
  slots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  cardItem: {
    width: '18%',
    minWidth: 0,
    backgroundColor: 'rgba(25, 36, 50, 0.96)',
    borderWidth: 1,
    borderRadius: 11,
    padding: 4,
    overflow: 'visible',
  },
  selected: {
    backgroundColor: '#34332E',
  },
  disabled: { opacity: 0.5 },
  rarityBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 5,
  },
  rarityText: { color: '#20242B', fontSize: 7, fontWeight: '800' },
  imageWrap: {
    width: '100%',
    aspectRatio: 512 / 720,
    marginBottom: 6,
  },
  cardImage: { width: '100%', height: '100%' },
  levelBadge: {
    position: 'absolute',
    left: 3,
    bottom: 3,
    backgroundColor: 'rgba(8, 12, 20, 0.84)',
    borderColor: '#EAC681',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  levelText: { color: '#F5D390', fontSize: 8, fontWeight: '800' },
  cardName: { color: '#F5F1E9', fontSize: 10, fontWeight: '700' },
  elementText: { color: '#AAB6C5', fontSize: 8, marginTop: 3 },
  selectText: {
    color: '#AAB6C5',
    textAlign: 'center',
    fontSize: 8,
    marginTop: 4,
    marginBottom: 1,
  },
  selectedText: {
    color: '#EAC681',
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 1,
  },
  empty: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: { color: '#F5F1E9', fontSize: 17, fontWeight: '700' },
  emptyText: { color: '#AAB6C5', fontSize: 13 },
});
