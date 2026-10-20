import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { PressableScale } from './PressableScale';
import { CourseCover } from './CourseCover';
import { SF } from './SFIcon';
import type { Course } from '../data/courses';
import { courseAccessBadge } from '../lib/coursePresentation';
import { lessons as lessonsWord } from '../data/plural';

export function FeaturedCard({
  course, owned, progress, showPrice, onPress,
}: { course: Course; owned?: boolean; progress?: number; showPrice?: boolean; onPress?: () => void }) {
  const badge = courseAccessBadge(course, showPrice);
  const { T, ty } = useTheme();
  const count = course.chaptersCount ?? course.lessons.length;
  const pct = Math.round(progress ?? 0);
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${course.title}. ${lessonsWord(count)}. ${owned ? `${pct}% пройдено` : badge.label}`}><View style={{ backgroundColor: T.cardBg, borderRadius: 18, borderCurve: 'continuous', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
      <CourseCover imageUrl={course.imageUrl} icon={course.icon} variant="featured" />
      <View style={{ paddingHorizontal: 14, paddingTop: 14, gap: 4 }}>
        <Text style={[ty.title3, { color: T.label }]}>{course.title}</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary }]}>{course.category}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
          <SF name="book.fill" size={13} color={T.labelSecondary} />
          <Text style={[ty.subhead, { color: T.labelSecondary, flexShrink: 1 }]}>{lessonsWord(count)}</Text>
        </View>
        {owned ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            <SF name="play.circle.fill" size={18} color={T.brandText} />
            <Text style={[ty.subheadEm, { color: T.brandText, flexShrink: 1 }]}>{pct > 0 ? `Продолжить · ${pct}%` : 'Начать'}</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            <SF name={badge.icon} size={16} color={badge.accent ? T.brandText : T.labelSecondary} />
            <Text style={[ty.subheadEm, { color: badge.accent ? T.brandText : T.labelSecondary, flexShrink: 1 }]}>
              {badge.label}
            </Text>
          </View>
        )}
      </View>
    </View></PressableScale>
  );
}
