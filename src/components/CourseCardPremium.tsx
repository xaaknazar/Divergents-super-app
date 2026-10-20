// Карточка курса — белый блок (handoff 2026-10-20, §4.6–4.7): обложка 16:9 сверху,
// название 15 bold в 2 строки, категория, внизу цена с шевроном или прогресс.
// grid — сетка каталога (карточки в ряду одной высоты); shelf — лента «Мои курсы».
import React from 'react';
import { StyleSheet,Text,View,useWindowDimensions } from 'react-native';
import type { Course } from '../data/courses';
import { lessons as lessonsWord } from '../data/plural';
import { courseAccessBadge } from '../lib/coursePresentation';
import { useTheme } from '../theme/ThemeContext';
import { FONT,nums,shadows } from '../theme/tokens';
import { CourseCover } from './CourseCover';
import { PressableScale } from './PressableScale';
import { ProgressBar } from './ProgressBar';
import { SF } from './SFIcon';
export { lessons as lessonsWord } from '../data/plural';
export { FeaturedCard } from './FeaturedCard';

export function CourseCardPremium({
  course, owned, progress, showPrice, variant = 'grid', onPress,
}: { course: Course; owned?: boolean; progress?: number; showPrice?: boolean; variant?: 'grid' | 'shelf'; onPress?: () => void }) {
  const badge = courseAccessBadge(course, showPrice);
  const { T, ty, isDark, textScale = 1 } = useTheme();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale * textScale > 1.3;
  const count = course.chaptersCount ?? course.lessons.length;
  const pct = Math.round(progress ?? 0);
  const done = pct >= 100;
  const meta = variant === 'grid' ? [course.category, lessonsWord(count)].filter(Boolean).join(' · ') : course.category;
  return (
    <PressableScale fill onPress={onPress} accessibilityLabel={`${course.title}. ${lessonsWord(count)}. ${owned ? `${pct}% пройдено` : badge.label}`}>
      <View style={[styles.card, { backgroundColor: T.cardBg }, isDark ? null : shadows.tappable]}>
        <View style={styles.clip}>
          <CourseCover imageUrl={course.imageUrl} icon={course.icon} />
          <View style={styles.body}>
            <Text style={[ty.subheadEm, styles.title, { color: T.label }]} numberOfLines={largeText ? undefined : 2}>{course.title}</Text>
            {meta ? <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 4 }]} numberOfLines={largeText ? undefined : 1}>{meta}</Text> : null}
            <View style={styles.footer}>
              {owned ? <View style={styles.progress}>
                <ProgressBar value={pct / 100} tone={done ? 'success' : 'brand'} accessibilityLabel={`Пройдено: ${course.title}`} />
                <Text style={[ty.caption1, nums, styles.progressText, { color: done ? T.greenText : T.brandText }]}>{done ? 'Пройден' : `${pct}% пройдено`}</Text>
              </View> : <View style={styles.price}>
                <Text style={[ty.subheadEm, { color: badge.accent ? T.brandText : T.labelSecondary, flexShrink: 1 }]} numberOfLines={1}>{badge.label}</Text>
                <SF name="chevron.right" size={16} color={T.labelTertiary} />
              </View>}
            </View>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Тень снаружи, скругление и обрезка обложки — на внутреннем слое (иначе iOS срежет тень).
  card: { flexGrow: 1, borderRadius: 14, borderCurve: 'continuous' },
  clip: { flexGrow: 1, borderRadius: 14, borderCurve: 'continuous', overflow: 'hidden' },
  body: { flexGrow: 1, paddingTop: 10, paddingHorizontal: 12, paddingBottom: 12 },
  title: { minHeight: 40 },
  footer: { marginTop: 'auto', paddingTop: 10 },
  progress: { gap: 6, paddingTop: 2 },
  progressText: { fontFamily: FONT.bold },
  price: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
