// Premium iOS-style course cards (brand navy aesthetic) powered by real data.
import React from 'react';
import { useTheme } from '../theme/ThemeContext';
import { View, Text } from 'react-native';
import { PressableScale } from './PressableScale';
import { Image } from 'expo-image';
import { SF } from './SFIcon';
import { ProgressBar, Capsule, ty } from './ui';
import { Course } from '../data/courses';
import { formatPrice, imgUrl } from '../data/api';

export function lessonsWord(n: number) {
  if (n === 1) return 'Тренинг';
  const d = n % 10, dd = n % 100;
  if (dd >= 11 && dd <= 19) return `${n} уроков`;
  if (d === 1) return `${n} урок`;
  if (d >= 2 && d <= 4) return `${n} урока`;
  return `${n} уроков`;
}

function Cover({ course, height }: { course: Course; height: number | string }) {
  if (course.imageUrl) {
    return <Image source={imgUrl(course.imageUrl, 640)} style={{ width: '100%', height: height as any }} contentFit="cover" transition={200} cachePolicy="memory-disk" />;
  }
  return (
    <View style={{ width: '100%', height: height as any, backgroundColor: course.tint, alignItems: 'center', justifyContent: 'center' }}>
      <SF name={course.icon} size={36} color={course.iconColor} />
    </View>
  );
}

// Grid / horizontal card
export function CourseCardPremium({
  course, owned, progress, width, onPress,
}: { course: Course; owned?: boolean; progress?: number; width?: number | string; onPress?: () => void }) {
  const { T } = useTheme();
  const count = course.chaptersCount ?? course.lessons.length;
  const pct = Math.round(progress ?? 0);
  const done = pct >= 100;
  return (
    <PressableScale onPress={onPress} accessibilityLabel={course.title} style={{
      width: width as any, backgroundColor: T.cardBg, borderRadius: 16, overflow: 'hidden',
      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
    }}>
      <View style={{ width: '100%', aspectRatio: 16 / 9 }}>
        <Cover course={course} height="100%" />
        {owned ? (
          <View style={{ position: 'absolute', top: 8, right: 8 }}>
            <Capsule bg={done ? 'rgba(52,199,89,0.92)' : 'rgba(35,64,136,0.92)'} color="#fff" style={{ paddingVertical: 3, paddingHorizontal: 8 }}>
              {done ? 'Пройден' : `${pct}%`}
            </Capsule>
          </View>
        ) : null}
      </View>
      <View style={{ padding: 12 }}>
        <Text style={[ty.subheadEm, { color: T.label, height: 40, lineHeight: 20 }]} numberOfLines={2}>{course.title}</Text>
        <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1}>{course.category}</Text>
        <View style={{ marginTop: 10, minHeight: 32, justifyContent: 'flex-end' }}>
          {owned ? (
            <View>
              <ProgressBar value={pct / 100} color={T.brand} />
              <Text style={[ty.caption2Em, { color: done ? T.green : T.brand, marginTop: 6 }]}>{pct}% пройдено</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <SF name="book.fill" size={12} color={T.labelTertiary} />
                <Text style={[ty.caption1, { color: T.labelSecondary }]}>{count}</Text>
              </View>
              <Text style={[ty.subheadEm, { color: T.brand }]}>{formatPrice(course.price)}</Text>
            </View>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

// Big featured / continue card
export function FeaturedCard({
  course, owned, progress, eyebrow, onPress,
}: { course: Course; owned?: boolean; progress?: number; eyebrow?: string; onPress?: () => void }) {
  const { T } = useTheme();
  const count = course.chaptersCount ?? course.lessons.length;
  const pct = Math.round(progress ?? 0);
  return (
    <PressableScale onPress={onPress} accessibilityLabel={course.title} style={{
      marginHorizontal: 16, backgroundColor: T.cardBg, borderRadius: 18, overflow: 'hidden',
      shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
    }}>
      <View style={{ height: 180 }}>
        <Cover course={course} height={180} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 110, backgroundColor: 'rgba(0,0,0,0.38)' }} />
        <View style={{ position: 'absolute', top: 12, left: 12 }}>
          <Capsule bg="rgba(255,255,255,0.92)" color={T.brand}>
            <SF name="sparkles" size={11} color={T.brand} />{eyebrow ?? 'Рекомендуем'}
          </Capsule>
        </View>
        <View style={{ position: 'absolute', left: 14, right: 14, bottom: 12 }}>
          <Text style={[ty.title3, { color: '#fff' }]} numberOfLines={2}>{course.title}</Text>
          <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 2 }]} numberOfLines={1}>{course.category}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <SF name="book.fill" size={13} color={T.labelSecondary} />
          <Text style={[ty.subhead, { color: T.labelSecondary }]}>{lessonsWord(count)}</Text>
        </View>
        {owned ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <SF name="play.circle.fill" size={18} color={T.brand} />
            <Text style={[ty.subheadEm, { color: T.brand }]}>{pct > 0 ? `Продолжить · ${pct}%` : 'Начать'}</Text>
          </View>
        ) : (
          <Text style={[ty.headline, { color: T.brand }]}>{formatPrice(course.price)}</Text>
        )}
      </View>
    </PressableScale>
  );
}
