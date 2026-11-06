// Обложка курса во всю ширину, как карточка фильма в Apple TV и альбома в Music
// на iOS 26: кадр уходит под статус-бар, кнопки шапки парят над ним стеклом, а
// низ кадра плавно растворяется в фоне страницы — заголовок идёт сразу под ним.
import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../theme/personalization';
import { imgUrl } from '../data/api';
import { SF, SFName } from './SFIcon';

export function CourseHero({ imageUrl, icon }: { imageUrl?: string | null; icon: SFName }) {
  const { T, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Кадр 4:3 по ширине экрана, но не выше 360 pt на планшете.
  const height = Math.min(360, Math.round(width * 0.75)) + insets.top;
  return <View testID="course-hero" accessible={false} importantForAccessibility="no-hide-descendants"
    style={{ height, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
    {imageUrl ? <Image source={imgUrl(imageUrl, 1080)} style={StyleSheet.absoluteFill}
      contentFit="cover" transition={reduceMotion ? 0 : 200} cachePolicy="memory-disk" />
      : <SF name={icon} size={56} color={T.brandText} />}
    {/* Сверху — лёгкая тень под стеклянными кнопками: белая стрелка читается и на светлом кадре. */}
    <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.32)', 'rgba(0,0,0,0)']} style={[styles.top, { height: insets.top + 90 }]} />
    {/* Снизу кадр растворяется в фоне страницы. */}
    <LinearGradient pointerEvents="none" colors={[hexToRgba(T.groupedBg, 0), hexToRgba(T.groupedBg, 0.7), T.groupedBg]} locations={[0, 0.6, 1]}
      style={styles.bottom} />
  </View>;
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 },
});
