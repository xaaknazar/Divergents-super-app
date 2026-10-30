// «Продолжить» на главной Обучения (handoff 2026-10-20, §4.3): компактный блок,
// вся карточка — ссылка. Обложка 64, подпись урока, название, мягкая кнопка ▶,
// ниже полоса прогресса и «N% пройдено». Без полноширинной синей кнопки.
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet,Text,View } from 'react-native';
import { imgUrl } from '../data/api';
import { useTheme } from '../theme/ThemeContext';
import { FONT,nums,shadows } from '../theme/tokens';
import { PressableScale } from './PressableScale';
import { ProgressBar } from './ProgressBar';
import { SF,SFName } from './SFIcon';

export interface LearningResumeCardProps {
  title: string;
  /** «Урок 15 из 34 · Significance» или категория, если текущий урок неизвестен. */
  caption?: string | null;
  /** 0–100. */
  progress: number;
  imageUrl?: string | null;
  icon?: SFName;
  onPress?: () => void;
}

export function LearningResumeCard({ title, caption, progress, imageUrl, icon = 'graduationcap.fill', onPress }: LearningResumeCardProps) {
  const { T, ty, isDark, reduceMotion } = useTheme();
  const pct = Math.round(Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0)));
  return <PressableScale onPress={onPress} accessibilityLabel={`Продолжить: ${title}${caption ? `. ${caption}` : ''}. ${pct}% пройдено`}>
    <View style={[styles.card, { backgroundColor: T.cardBg }, isDark ? null : shadows.tappable]}>
      <View style={styles.top}>
        <View style={[styles.cover, { backgroundColor: T.brandTinted }]}>
          {imageUrl ? <Image source={imgUrl(imageUrl, 200)} style={StyleSheet.absoluteFill} contentFit="cover"
            cachePolicy="memory-disk" transition={reduceMotion ? 0 : 150} />
            : <SF name={icon} size={28} color={T.brandText} />}
        </View>
        <View style={styles.text}>
          {caption ? <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>{caption}</Text> : null}
          <Text style={[ty.headline, { color: T.label }]} numberOfLines={2}>{title}</Text>
        </View>
        <View style={[styles.play, { backgroundColor: isDark ? T.brandTinted : 'rgba(35,64,136,0.09)' }]}>
          <View style={styles.playGlyph}><SF name="play.fill" size={20} color={T.brandText} /></View>
        </View>
      </View>
      <View style={styles.progress}>
        <View style={styles.bar}><ProgressBar value={pct / 100} accessibilityLabel={`Пройдено: ${title}`} /></View>
        <Text style={[ty.caption1, nums, styles.progressText, { color: T.labelSecondary }]}>{pct}% пройдено</Text>
      </View>
    </View>
  </PressableScale>;
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderCurve: 'continuous', paddingTop: 14, paddingHorizontal: 14, paddingBottom: 16, gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cover: { width: 64, height: 64, borderRadius: 12, borderCurve: 'continuous', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 3 },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  playGlyph: { marginLeft: 2 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { flex: 1 },
  progressText: { fontFamily: FONT.semibold },
});
