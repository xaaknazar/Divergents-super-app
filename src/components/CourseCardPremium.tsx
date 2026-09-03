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
import * as pl from '../data/plural';

// Что писать на карточке некупленного курса. `showPrice` — фича-флаг покупки в
// приложении (по умолчанию выключен, тогда всё как раньше: «Нет доступа»).
// Подарок важнее цены: такой курс человеку ничего не стоит.
function accessBadge(course: Course, showPrice?: boolean) {
  const free = course.price == null || course.price <= 0;
  const gifted = course.gifted === true;
  const priced = !free && !gifted && showPrice === true;
  return {
    icon: gifted ? 'gift.fill' : free ? 'play.circle.fill' : priced ? 'creditcard.fill' : 'lock.fill',
    label: gifted ? 'Подарок' : free ? 'Бесплатно' : priced ? formatPrice(course.price) : 'Нет доступа',
    accent: gifted || free || priced,
  };
}

/** «1 урок / 2 урока / 5 уроков». */
export const lessonsWord = (n: number) => pl.lessons(n);

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
  course, owned, progress, width, showPrice, onPress,
}: { course: Course; owned?: boolean; progress?: number; width?: number | string; showPrice?: boolean; onPress?: () => void }) {
  const badge = accessBadge(course, showPrice);
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
            <Capsule bg={T.brand} color="#fff" style={{ paddingVertical: 3, paddingHorizontal: 8 }}>
              {done ? 'Пройден' : `${pct}%`}
            </Capsule>
          </View>
        ) : null}
      </View>
      <View style={{ padding: 12 }}>
        <Text style={[ty.subheadEm, { color: T.label, minHeight: 40 }]} numberOfLines={2}>{course.title}</Text>
        <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={2}>{course.category}</Text>
        <View style={{ marginTop: 10, minHeight: 32, justifyContent: 'flex-end' }}>
          {owned ? (
            <View>
              <ProgressBar value={pct / 100} color={T.brand} />
              <Text style={[ty.caption2Em, { color: T.brand, marginTop: 6 }]}>{pct}% пройдено</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
                <SF name="book.fill" size={12} color={T.labelTertiary} />
                <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>{count}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                <SF name={badge.icon} size={12} color={badge.accent ? T.brand : T.labelTertiary} />
                <Text style={[ty.caption1, { color: badge.accent ? T.brand : T.labelSecondary }]} numberOfLines={1}>
                  {badge.label}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

// Big featured / continue card
export function FeaturedCard({
  course, owned, progress, eyebrow, showPrice, onPress,
}: { course: Course; owned?: boolean; progress?: number; eyebrow?: string; showPrice?: boolean; onPress?: () => void }) {
  const badge = accessBadge(course, showPrice);
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
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 76, backgroundColor: 'rgba(0,0,0,0.42)' }} />
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
          <SF name="book.fill" size={13} color={T.labelSecondary} />
          <Text style={[ty.subhead, { color: T.labelSecondary }]} numberOfLines={1}>{lessonsWord(count)}</Text>
        </View>
        {owned ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
            <SF name="play.circle.fill" size={18} color={T.brand} />
            <Text style={[ty.subheadEm, { color: T.brand }]} numberOfLines={1}>{pct > 0 ? `Продолжить · ${pct}%` : 'Начать'}</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
            <SF name={badge.icon} size={16} color={badge.accent ? T.brand : T.labelSecondary} />
            <Text style={[ty.subheadEm, { color: badge.accent ? T.brand : T.labelSecondary }]} numberOfLines={1}>
              {badge.label}
            </Text>
          </View>
        )}
      </View>
    </PressableScale>
  );
}
