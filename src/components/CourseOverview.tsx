import React from 'react';
import { Text, View } from 'react-native';
import { Course } from '../data/courses';
import { useTheme } from '../theme/ThemeContext';
import { tr } from '../state/LanguageContext';
import { CourseCover } from './CourseCover';
import { lessonsWord } from './CourseCardPremium';
import { StatusBadge } from './StatusBadge';

/** `withHero` — обложка уже показана сверху во всю ширину: без миниатюры, заголовок крупнее. */
export function CourseOverview({ course, accessible, withHero = false }: { course: Course; accessible: boolean; withHero?: boolean }) {
  const { T, ty } = useTheme();
  return <View style={{ gap: 16, paddingVertical: withHero ? 0 : 8, marginTop: withHero ? -28 : 0 }}>
    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
      <View style={{ flex: 1, gap: 8 }}>
        <Text accessibilityRole="header" style={[withHero ? ty.title1 : ty.title2, { color: T.label }]}>{course.title}</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary }]}>{course.author} · Divergents</Text>
      </View>
      {withHero ? null : <CourseCover imageUrl={course.imageUrl} icon={course.icon} variant="thumbnail" />}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <StatusBadge label={course.category} tone="neutral" />
      <StatusBadge label={lessonsWord(course.chaptersCount ?? course.lessons.length)} tone="neutral" />
      {accessible ? <StatusBadge label={tr('Курс открыт')} tone="success" icon="checkmark.seal.fill" /> : null}
    </View>
  </View>;
}
