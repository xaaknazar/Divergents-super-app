import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { PressableScale } from './PressableScale';
import { CourseCover } from './CourseCover';
import { SF } from './SFIcon';
import type { Course } from '../data/courses';
import { courseAccessBadge } from '../lib/coursePresentation';
import { lessons as lessonsWord } from '../data/plural';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';
export { lessons as lessonsWord } from '../data/plural';
export { FeaturedCard } from './FeaturedCard';

export function CourseCardPremium({
  course, owned, progress, showPrice, onPress,
}: { course: Course; owned?: boolean; progress?: number; showPrice?: boolean; onPress?: () => void }) {
  const badge = courseAccessBadge(course, showPrice);
  const { T, ty, textScale = 1 } = useTheme();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale * textScale > 1.3;
  const count = course.chaptersCount ?? course.lessons.length;
  const pct = Math.round(progress ?? 0);
  const done = pct >= 100;
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${course.title}. ${lessonsWord(count)}. ${owned ? `${pct}% пройдено` : badge.label}`}><View style={{ backgroundColor: T.cardBg, borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}>
      <View>
        <CourseCover imageUrl={course.imageUrl} icon={course.icon} />
        {owned ? (
          <View style={{ position: 'absolute', top: 8, right: 8 }}>
            <StatusBadge label={String((done ? 'Пройден' : `${pct}%`))} tone="brand" variant="solid" size="compact" />
          </View>
        ) : null}
      </View>
      <View style={{ padding: 12 }}>
        <Text style={[ty.subheadEm, { color: T.label, minHeight: 40 }]} numberOfLines={largeText ? undefined : 2}>{course.title}</Text>
        <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>{course.category}</Text>
        <View style={{ marginTop: 10, minHeight: 32, justifyContent: 'flex-end' }}>
          {owned ? (
            <View>
              <ProgressBar value={pct / 100} />
              <Text style={[ty.caption2Em, { color: T.brandText, marginTop: 6 }]}>{pct}% пройдено</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
                <SF name="book.fill" size={12} color={T.labelTertiary} />
                <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>{count}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
                <SF name={badge.icon} size={12} color={badge.accent ? T.brandText : T.labelTertiary} />
                <Text style={[ty.caption1, { color: badge.accent ? T.brandText : T.labelSecondary, flexShrink: 1 }]}>
                  {badge.label}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View></PressableScale>
  );
}
