// Course card matching the Divergents LMS website design:
// aspect-video cover, title, category, then either "уроки + цена" badges
// (not owned) or a sky progress bar (owned).
import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { SF } from './SFIcon';
import { T, ty } from './ui';
import { Course } from '../data/courses';
import { formatPrice } from '../data/api';

function lessonsWord(n: number) {
  if (n === 1) return 'Тренинг';
  const d = n % 10, dd = n % 100;
  if (dd >= 11 && dd <= 19) return `${n} уроков`;
  if (d === 1) return `${n} урок`;
  if (d >= 2 && d <= 4) return `${n} урока`;
  return `${n} уроков`;
}

export function SiteCourseCard({
  course, owned, progress, width, onPress,
}: {
  course: Course;
  owned?: boolean;
  progress?: number; // 0..100
  width?: number | string;
  onPress?: () => void;
}) {
  const count = course.chaptersCount ?? course.lessons.length;
  const pct = Math.round(progress ?? 0);
  const done = pct >= 100;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: width as any,
        backgroundColor: T.cardBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: T.cardBorder,
        overflow: 'hidden',
        opacity: pressed ? 0.85 : 1,
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
      })}
    >
      <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: course.tint }}>
        {course.imageUrl ? (
          <Image source={{ uri: course.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <SF name={course.icon} size={34} color={course.iconColor} />
          </View>
        )}
      </View>

      <View style={{ padding: 12, gap: 4 }}>
        <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={1}>{course.title}</Text>
        <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>{course.category}</Text>

        {owned ? (
          <View style={{ marginTop: 6 }}>
            <View style={{ height: 8, borderRadius: 999, backgroundColor: T.skyTrack, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 999, backgroundColor: done ? T.green : T.skyProgress }} />
            </View>
            <Text style={[ty.caption2Em, { color: done ? T.green : T.sky, marginTop: 6 }]}>{pct}% Пройдено</Text>
          </View>
        ) : (
          <View style={{ marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: T.cardBorder, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7, backgroundColor: T.skyBadgeBg }}>
              <SF name="book" size={12} color={T.skyDeep} />
              <Text style={[ty.caption2Em, { color: T.skyDeep }]}>{lessonsWord(count)}</Text>
            </View>
            <View style={{ borderWidth: 1, borderColor: T.cardBorder, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7, backgroundColor: T.emeraldBadgeBg }}>
              <Text style={[ty.caption2Em, { color: T.emeraldText }]}>{formatPrice(course.price)}</Text>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}
