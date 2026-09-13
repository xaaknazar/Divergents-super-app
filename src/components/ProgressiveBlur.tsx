// Прогрессивное размытие — «стеклянный» край, как в Настройках и Музыке на iOS:
// у самой кромки экрана размытие сильное, к центру сходит на нет.
//
// В оригинальном приёме (expo-progressive-blur) градиентная маска рисуется
// через MaskedView. Здесь то же самое собрано из слоёв: несколько BlurView
// разной силы, каждый занимает свою полосу от края. Причина не в лени —
// MaskedView и Reanimated это два новых нативных модуля, а у нас на носу старт
// челленджа и уже собранная сборка. Визуально разница на градиенте почти
// незаметна, а риск сборки нулевой: expo-blur и expo-linear-gradient уже стоят.
//
// Если однажды понадобится настоящая маска — компонент менять не придётся,
// достаточно переписать его внутренности: наружу он отдаёт один прямоугольник.
import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

export interface ProgressiveBlurProps {
  /** С какого края экрана растёт размытие. */
  position?: 'top' | 'bottom';
  /** Высота зоны размытия. */
  height?: number;
  /** Сила размытия у самой кромки (0–100). */
  intensity?: number;
  /** Сколько слоёв: больше — плавнее и дороже. 4 хватает. */
  layers?: number;
  style?: ViewStyle;
}

export function ProgressiveBlur({
  position = 'bottom',
  height = 96,
  intensity = 70,
  layers = 4,
  style,
}: ProgressiveBlurProps) {
  const { isDark, reduceTransparency } = useTheme();

  // Цвет подложки в rgba: градиент должен уходить в прозрачность, а не в белое
  // пятно. Берём цвет фона экрана и меняем только альфу.
  const base = isDark ? '18,22,33' : '249,249,249';
  const fadeColors = position === 'bottom'
    ? ([`rgba(${base},0)`, `rgba(${base},0.55)`, `rgba(${base},0.92)`] as const)
    : ([`rgba(${base},0.92)`, `rgba(${base},0.55)`, `rgba(${base},0)`] as const);

  // Прижимаем к нужному краю: без этого абсолютный блок встаёт туда, где его
  // поставил поток, и размытие оказывается посреди экрана.
  const edge = position === 'bottom' ? { bottom: 0 } : { top: 0 };

  // «Уменьшение прозрачности» в системных настройках — вместо стекла градиент
  // фона: размывать в этом режиме нельзя, человек попросил этого не делать.
  if (reduceTransparency || Platform.OS === 'android') {
    // На Android системного материала нет: наложенный blur там дороже и
    // выглядит грязно, поэтому честный градиент фона.
    return (
      <LinearGradient
        pointerEvents="none"
        colors={fadeColors}
        style={[{ height }, styles.fill, edge, style]}
      />
    );
  }

  return (
    <View pointerEvents="none" style={[{ height, overflow: 'hidden' }, styles.fill, edge, style]}>
      {Array.from({ length: layers }).map((_, i) => {
        // Каждый следующий слой занимает бо́льшую долю высоты и размывает
        // слабее: их наложение и даёт нарастание от края к центру.
        const share = (i + 1) / layers;
        const layerIntensity = Math.max(4, Math.round((intensity * (layers - i)) / layers));
        return (
          <BlurView
            key={i}
            tint={isDark ? 'dark' : 'light'}
            intensity={layerIntensity}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: height * share,
              ...(position === 'bottom' ? { bottom: 0 } : { top: 0 }),
            }}
          />
        );
      })}
      {/* Тонировка фоном — без неё текст под краем читается сквозь стекло. */}
      <LinearGradient pointerEvents="none" colors={fadeColors} style={StyleSheet.absoluteFillObject} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', left: 0, right: 0 },
});
