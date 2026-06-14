import React from 'react';
import { View, Text, Pressable, Image, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavBarLarge, HeaderIcon } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { ProgressBar, Capsule, IconCircle, SectionHeader, T, ty } from '../../components/ui';
import { useCourses } from '../../state/CourseContext';
import { formatPrice } from '../../data/api';
import { Course } from '../../data/courses';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'LMSHome'>;

function Cover({ course, height, radius = 0 }: { course: Course; height: number; radius?: number }) {
  if (course.imageUrl) {
    return <Image source={{ uri: course.imageUrl }} style={{ width: '100%', height, borderRadius: radius }} resizeMode="cover" />;
  }
  return (
    <View style={{ width: '100%', height, borderRadius: radius, backgroundColor: course.tint, alignItems: 'center', justifyContent: 'center' }}>
      <SF name={course.icon} size={Math.min(44, height * 0.34)} color={course.iconColor} />
    </View>
  );
}

export function LMSHomeScreen({ navigation }: Props) {
  const { courses, loading, source, progress, reload } = useCourses();

  if (loading) {
    return (
      <Screen>
        <NavBarLarge title="Обучение и развитие" />
        <View style={{ paddingTop: 80, alignItems: 'center' }}>
          <ActivityIndicator color={T.brand} />
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 12 }]}>Загружаем курсы…</Text>
        </View>
      </Screen>
    );
  }

  if (courses.length === 0) {
    return (
      <Screen>
        <NavBarLarge title="Обучение и развитие" />
        <View style={{ paddingTop: 80, alignItems: 'center', paddingHorizontal: 40 }}>
          <SF name="book" size={40} color={T.labelTertiary} />
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 12, textAlign: 'center' }]}>Курсы не найдены. Проверьте подключение.</Text>
          <Pressable onPress={reload} style={{ marginTop: 14 }}><Text style={[ty.body, { color: T.brand }]}>Обновить</Text></Pressable>
        </View>
      </Screen>
    );
  }

  const cont = courses.find((c) => progress(c.id) > 0) ?? courses[0];
  const contProgress = progress(cont.id);
  const featured = courses[0];
  const grid = courses.slice(1, 5);

  return (
    <Screen>
      <NavBarLarge title="Обучение и развитие" trailing={<>
        <HeaderIcon name="magnifyingglass" onPress={() => navigation.navigate('Catalog')} />
        <HeaderIcon name="ellipsis" />
      </>} />

      <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16 }}>
        <Text style={[ty.callout, { color: T.labelSecondary }]}>Доброе утро, Beknazar</Text>
        <Text style={[ty.headline, { color: T.label, marginTop: 2 }]}>
          {source === 'mock' ? 'Демо-режим · нет связи с сайтом' : 'Продолжайте обучение'}
        </Text>
      </View>

      {/* Continue card */}
      <Pressable
        onPress={() => navigation.navigate('CourseDetail', { courseId: cont.id })}
        style={({ pressed }) => ({ marginHorizontal: 16, backgroundColor: T.cardBg, borderRadius: 14, padding: 16, marginBottom: 16, opacity: pressed ? 0.85 : 1 })}
      >
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 14, overflow: 'hidden' }}>
            <Cover course={cont} height={56} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ty.caption2Em, { color: T.labelSecondary, textTransform: 'uppercase', letterSpacing: 0.6 }]}>
              {contProgress > 0 ? 'Продолжить' : 'Начать'}
            </Text>
            <Text style={[ty.headline, { color: T.label, marginTop: 1 }]} numberOfLines={1}>{cont.title}</Text>
            <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>{cont.lessonsLabel}</Text>
          </View>
          <SF name="chevron.forward" size={14} color={T.labelTertiary} />
        </View>
        {contProgress > 0 ? (
          <View style={{ marginTop: 14 }}>
            <ProgressBar value={contProgress} />
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 6 }]}>{Math.round(contProgress * 100)}% завершено</Text>
          </View>
        ) : null}
      </Pressable>

      <SectionHeader title="Рекомендуем для вас" action="Все" onAction={() => navigation.navigate('Catalog')} />

      {/* Featured */}
      <Pressable
        onPress={() => navigation.navigate('CourseDetail', { courseId: featured.id })}
        style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: T.cardBg, borderRadius: 16, overflow: 'hidden' }}
      >
        <View>
          <Cover course={featured} height={150} />
          <View style={{ position: 'absolute', top: 12, left: 12 }}>
            <Capsule bg="rgba(255,255,255,0.85)" color={T.brand}><SF name="sparkles" size={11} color={T.brand} />Рекомендуем</Capsule>
          </View>
        </View>
        <View style={{ padding: 14 }}>
          <Text style={[ty.title3, { color: T.label }]} numberOfLines={2}>{featured.title}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 3 }]}>{featured.author} · {featured.lessonsLabel}</Text>
          <View style={{ height: 0.5, backgroundColor: T.separator, marginVertical: 12 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Capsule bg={T.fillTertiary} color={T.label}>{featured.category}</Capsule>
            <Text style={[ty.headline, { color: T.brand }]}>{formatPrice(featured.price)}</Text>
          </View>
        </View>
      </Pressable>

      {/* AI promo */}
      <Pressable
        onPress={() => navigation.getParent()?.navigate('AITab' as never)}
        style={{ marginHorizontal: 16, marginBottom: 20, backgroundColor: T.brandTinted, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <IconCircle icon="sparkles" color={T.brand} bg="rgba(35,64,136,0.12)" size={40} iconSize={20} />
        <View style={{ flex: 1 }}>
          <Text style={[ty.headline, { color: T.label }]}>Подобрать курсы под Strategic?</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 1 }]}>AI наставник готов помочь</Text>
        </View>
        <SF name="chevron.forward" size={14} color={T.brand} />
      </Pressable>

      {/* Catalog grid */}
      {grid.length > 0 ? (
        <>
          <SectionHeader title="Каталог" action="Все" onAction={() => navigation.navigate('Catalog')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 12, marginBottom: 20 }}>
            {grid.map((c) => {
              const p = progress(c.id);
              return (
                <Pressable key={c.id} onPress={() => navigation.navigate('CourseDetail', { courseId: c.id })}
                  style={{ width: '47.6%', backgroundColor: T.cardBg, borderRadius: 14, overflow: 'hidden' }}>
                  <Cover course={c} height={92} />
                  <View style={{ padding: 12 }}>
                    <Text style={[ty.footnoteEm, { color: T.label, lineHeight: 17 }]} numberOfLines={2}>{c.title}</Text>
                    <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 4 }]}>{c.lessonsLabel} · {formatPrice(c.price)}</Text>
                    {p > 0 ? <View style={{ marginTop: 8 }}><ProgressBar value={p} height={3} /></View> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
