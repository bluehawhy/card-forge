import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  cardCatalog,
  cardCatalogElements,
  cardCatalogGrades,
} from '../features/game-cache/cardCatalog';
import type {
  CachedCollectionEntry,
  CardElement,
} from '../features/game-cache/gameCache';
import {
  elementLabels,
  getCardImage,
  gradeLabels,
} from '../features/game-cache/gamePresentation';
import { cardOutlineColors } from './card';

interface CardCollectionModalProps {
  collection: readonly CachedCollectionEntry[];
  visible: boolean;
  onClose: () => void;
}

interface CardCollectionViewProps {
  collection: readonly CachedCollectionEntry[];
  headerAccessory?: React.ReactNode;
  onClose?: () => void;
}

export function CardCollectionModal({
  collection,
  visible,
  onClose,
}: CardCollectionModalProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.sheet}>
          <CardCollectionView collection={collection} onClose={onClose} />
        </View>
      </View>
    </Modal>
  );
}

export function CardCollectionView({
  collection,
  headerAccessory,
  onClose,
}: CardCollectionViewProps) {
  const [selectedElement, setSelectedElement] = useState<CardElement>('EARTH');
  const discoveredByTemplateId = useMemo(
    () => new Map(collection.map((entry) => [entry.templateId, entry])),
    [collection],
  );
  const cards = cardCatalog.filter((card) => card.element === selectedElement);

  return (
    <>
      <View style={modalStyles.header}>
        <View>
          <Text style={modalStyles.eyebrow}>CARD COLLECTION</Text>
          <Text style={modalStyles.title}>카드 도감</Text>
          <Text style={modalStyles.progress}>
            발견 {collection.length} / {cardCatalog.length}
          </Text>
        </View>
        {onClose ? (
            <TouchableOpacity
              accessibilityLabel="카드 도감 닫기"
              accessibilityRole="button"
              onPress={onClose}
              style={modalStyles.closeButton}
            >
              <Text style={modalStyles.closeText}>×</Text>
            </TouchableOpacity>
        ) : null}
      </View>

      {headerAccessory}

      <ScrollView
        horizontal
        style={modalStyles.elementTabsScroll}
        contentContainerStyle={modalStyles.elementTabs}
        showsHorizontalScrollIndicator={false}
      >
        {cardCatalogElements.map((element) => {
          const selected = element === selectedElement;
          return (
            <TouchableOpacity
              key={element}
              accessibilityLabel={`${elementLabels[element]} 원소 카드 보기`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setSelectedElement(element)}
              style={[
                modalStyles.elementTab,
                selected && modalStyles.elementTabSelected,
              ]}
            >
              <Text
                style={[
                  modalStyles.elementTabText,
                  selected && modalStyles.elementTabTextSelected,
                ]}
              >
                {elementLabels[element]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={modalStyles.cardScroll}
        contentContainerStyle={modalStyles.cardList}
        showsVerticalScrollIndicator={false}
      >
        {cardCatalogGrades.map((grade) => {
          const card = cards.find((entry) => entry.grade === grade);
          if (!card) return null;
          const discovered = discoveredByTemplateId.get(card.templateId);
          return (
            <View key={card.templateId} style={modalStyles.cardRow}>
              {discovered ? (
                <Image
                  accessibilityLabel={`${card.name} 카드 이미지`}
                  resizeMode="cover"
                  source={getCardImage(discovered.imageKey || card.imageKey)}
                  style={modalStyles.cardImage}
                />
              ) : (
                <View
                  accessibilityLabel={`${gradeLabels[grade]} 미발견 카드`}
                  style={[modalStyles.cardImage, modalStyles.unknownCard]}
                >
                  <Text style={modalStyles.questionMark}>?</Text>
                </View>
              )}
              <View style={modalStyles.cardCopy}>
                <Text
                  style={[
                    modalStyles.grade,
                    { color: cardOutlineColors[grade] },
                  ]}
                >
                  {gradeLabels[grade]}
                </Text>
                <Text style={modalStyles.cardName}>
                  {discovered ? card.name : '미발견 카드'}
                </Text>
                <Text style={modalStyles.cardStatus}>
                  {discovered
                    ? `발견 완료 · 최고 ${discovered.highestEnhancementLevel}강`
                    : '카드팩에서 발견할 수 있어요'}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 9, 15, 0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '88%',
    backgroundColor: '#101722',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: '#344153',
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrow: {
    color: '#D5B87F',
    fontSize: 9,
    letterSpacing: 2.6,
    fontWeight: '700',
  },
  title: { color: '#FFF5E3', fontSize: 25, fontWeight: '800', marginTop: 5 },
  progress: { color: '#AAB6C5', fontSize: 12, marginTop: 5 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#44536A',
    backgroundColor: '#192432',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#E9EEF4', fontSize: 25, lineHeight: 27 },
  elementTabsScroll: { flexGrow: 0 },
  elementTabs: { gap: 8, paddingVertical: 18 },
  elementTab: {
    minWidth: 58,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#344153',
    backgroundColor: '#192432',
    alignItems: 'center',
  },
  elementTabSelected: { borderColor: '#D5B87F', backgroundColor: '#2A2A2C' },
  elementTabText: { color: '#929FAF', fontSize: 12, fontWeight: '700' },
  elementTabTextSelected: { color: '#F4D391' },
  cardList: { gap: 10, paddingBottom: 30 },
  cardScroll: { flex: 1 },
  cardRow: {
    minHeight: 112,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#344153',
    backgroundColor: '#192432',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardImage: { width: 68, height: 92, borderRadius: 10 },
  unknownCard: {
    backgroundColor: '#05070A',
    borderWidth: 1,
    borderColor: '#303946',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionMark: { color: '#52606F', fontSize: 28, fontWeight: '800' },
  cardCopy: { flex: 1, marginLeft: 14 },
  grade: { color: '#D5B87F', fontSize: 10, fontWeight: '800' },
  cardName: { color: '#F5F1E9', fontSize: 15, fontWeight: '700', marginTop: 5 },
  cardStatus: { color: '#929FAF', fontSize: 11, marginTop: 7 },
});
