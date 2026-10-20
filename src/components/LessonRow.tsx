import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Lesson } from '../data/courses';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';

export type LessonRowState = 'done' | 'current' | 'available' | 'free' | 'locked';
export function LessonRow({ lesson, state, onPress }: { lesson: Lesson; state: LessonRowState; onPress?: () => void }) {
  const { T, ty } = useTheme();
  const locked = state === 'locked';
  const subtitle = locked ? 'Откроется вместе с курсом' : state === 'free' ? 'Смотреть бесплатно' : state === 'done' ? 'Пройдено' : lesson.duration;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${lesson.n}. ${lesson.title}. ${subtitle}`}
    accessibilityState={{ disabled: locked || !onPress, selected: state === 'current' }} disabled={locked || !onPress} onPress={onPress}
    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 64,
      backgroundColor: state === 'current' ? T.brandTinted : 'transparent', opacity: pressed ? 0.65 : 1 })}>
    <SF name={locked ? 'lock.fill' : state === 'done' ? 'checkmark.circle.fill' : 'play.circle.fill'} size={26}
      color={locked ? T.labelSecondary : state === 'done' ? T.greenText : T.brandText} />
    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
      <Text style={[ty.body, { color: locked ? T.labelSecondary : T.label }]}>{lesson.n}. {lesson.title}</Text>
      <Text style={[ty.footnote, { color: T.labelSecondary }]}>{subtitle}</Text>
    </View>
  </Pressable>;
}
