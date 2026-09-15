import React from 'react';
import { StyleSheet, View } from 'react-native';

interface MaxLevelAuraProps {
  level: number;
  borderRadius?: number;
  color?: string;
  blurScale?: number;
  wideBlurRadius?: number;
  coreBlurRadius?: number;
  wideElevation?: number;
  coreElevation?: number;
  spreadScale?: number;
  wideOpacity?: number;
  coreOpacity?: number;
  uniformShadow?: boolean;
}

function withAlpha(hexColor: string, alpha: number) {
  const hex = hexColor.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return hexColor;
  const value = Number.parseInt(hex, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

/** 10강은 금색, 그 외 카드는 등급색의 부드러운 확산광을 표시합니다. */
export function MaxLevelAura({
  level,
  borderRadius = 18,
  color,
  blurScale = 1,
  wideBlurRadius,
  coreBlurRadius,
  wideElevation,
  coreElevation,
  spreadScale,
  wideOpacity,
  coreOpacity,
  uniformShadow = false,
}: MaxLevelAuraProps) {
  const isMaxLevel = level >= 10;
  if (!isMaxLevel && !color) return null;
  const auraColor = isMaxLevel ? '#FFD76A' : (color ?? '#FFD76A');
  const resolvedWideRadius =
    wideBlurRadius ?? (isMaxLevel ? 34 : 22) * blurScale;
  const resolvedCoreRadius =
    coreBlurRadius ?? (isMaxLevel ? 18 : 12) * blurScale;
  const resolvedWideOpacity = wideOpacity ?? (isMaxLevel ? 1 : 0.78);
  const resolvedCoreOpacity = coreOpacity ?? (isMaxLevel ? 0.92 : 0.62);

  return (
    <View
      pointerEvents="none"
      testID={isMaxLevel ? 'max-level-gold-aura' : 'grade-color-aura'}
      style={styles.aura}
    >
      <View
        testID={
          isMaxLevel ? 'max-level-gold-wide-glow' : 'grade-color-wide-glow'
        }
        style={[
          styles.glow,
          {
            borderRadius,
            backgroundColor: withAlpha(auraColor, 0.012),
            shadowColor: auraColor,
            shadowOpacity: uniformShadow ? 0 : resolvedWideOpacity,
            shadowRadius: resolvedWideRadius,
            elevation: uniformShadow
              ? 0
              : (wideElevation ?? (isMaxLevel ? 18 : 11) * blurScale),
            boxShadow: uniformShadow
              ? [
                  {
                    offsetX: 0,
                    offsetY: 0,
                    blurRadius: resolvedWideRadius,
                    color: withAlpha(auraColor, resolvedWideOpacity),
                  },
                ]
              : undefined,
            transform: [
              {
                scale:
                  spreadScale ??
                  1 + (isMaxLevel ? 0.025 : 0.015) * blurScale,
              },
            ],
          },
        ]}
      />
      <View
        testID={
          isMaxLevel ? 'max-level-gold-core-glow' : 'grade-color-core-glow'
        }
        style={[
          styles.glow,
          {
            borderRadius,
            backgroundColor: withAlpha(auraColor, 0.01),
            shadowColor: auraColor,
            shadowOpacity: uniformShadow ? 0 : resolvedCoreOpacity,
            shadowRadius: resolvedCoreRadius,
            elevation: uniformShadow
              ? 0
              : (coreElevation ?? (isMaxLevel ? 14 : 8) * blurScale),
            boxShadow: uniformShadow
              ? [
                  {
                    offsetX: 0,
                    offsetY: 0,
                    blurRadius: resolvedCoreRadius,
                    color: withAlpha(auraColor, resolvedCoreOpacity),
                  },
                ]
              : undefined,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  aura: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    shadowOffset: { width: 0, height: 0 },
  },
});
