import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavBarLarge, HeaderIcon } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { ProgressBar, Capsule, IconCircle, SectionHeader, T, ty } from '../../components/ui';
import { useCourses, COURSES } from '../../state/CourseContext';
import { getCourse } from '../../data/courses';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'LMSHome'>;

export function LMSHomeScreen({ navigation }: Props) {
  const { progress, currentLessonIndex } = useCourses();
  const cont = getCourse('leadership')!;
  const contProgress = progress('leadership');
  const contIdx = currentLessonIndex('leadership');
  const contLesson = cont.lessons[contIdx];
  const remaining = Math.round(cont.lessons.slice(contIdx).reduce((s, l) => s + l.minutes, 0) * (1 - 0.0));

  const featured = getCourse('gallup-max')!;
  const inProgressCount = COURSES.filter((c) => progress(c.id) > 0).length;

  const stats = [
    { icon: 'flame.fill' as const, color: T.orange, value: '12', label: 'Серия дней' },
    { icon: 'graduationcap.fill' as const, color: T.brand, value: String(inProgressCount), label: 'Курсов' },
    { icon: 'clock.fill' as const, color: T.brandAccent, value: '42', label: 'Часов' },
  ];

  const grid = COURSES.slice(2, 6);

  return (
    <Screen>
      <NavBarLarge title="Обучение и развитие" trailing={<>
        <HeaderIcon name="magnifyingglass" onPress={() => navigation.navigate('Catalog')} />
        <HeaderIcon name="ellipsis" />
      </>} />

      {/* Greeting */}
      <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16 }}>
        <Text style={[ty.callout, { color: T.labelSecondary }]}>Доброе утро, Beknazar</Text>
        <Text style={[ty.headline, { color: T.label, marginTop: 2 }]}>Продолжайте обучение</Text>
      </View>

      {/* Continue card */}
      <Pressable
        onPress={() => navigation.navigate('CourseDetail', { courseId: 'leadership' })}
        style={({ pressed }) => ({ marginHorizontal: 16, backgroundColor: T.cardBg, borderRadius: 14, padding: 16, marginBottom: 16, opacity: pressed ? 0.85 : 1 })}
      >
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
            <SF name="play.fill" size={22} color={T.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ty.caption2Em, { color: T.labelSecondary, textTransform: 'uppercase', letterSpacing: 0.6 }]}>Продолжить</Text>
            <Text style={[ty.headline, { color: T.label, marginTop: 1 }]}>{cont.title}</Text>
            <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 1 }]}>Урок {contLesson.n} · {contLesson.title}</Text>
          </View>
          <SF name="chevron.forward" size={14} color={T.labelTertiary} />
        </View>
        <View style={{ marginTop: 14 }}>
          <ProgressBar value={contProgress} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={[ty.caption1, { color: T.labelSecondary }]}>{Math.round(contProgress * 100)}% завершено</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary }]}>{remaining} мин осталось</Text>
          </View>
        </View>
      </Pressable>

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 20 }}>
        {stats.map((s, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: T.cardBg, borderRadius: 14, padding: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <SF name={s.icon} size={14} color={s.color} />
              <Text style={[ty.caption2, { color: T.labelSecondary }]}>{s.label.toUpperCase()}</Text>
            </View>
            <Text style={[ty.title2, { color: T.label, marginTop: 6 }]}>{s.value}</Text>
          </View>
        ))}
      </View>

      <SectionHeader title="Рекомендуем для вас" action="Все" onAction={() => navigation.navigate('Catalog')} />

      {/* Featured course */}
      <Pressable
        onPress={() => navigation.navigate('CourseDetail', { courseId: featured.id })}
        style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: T.cardBg, borderRadius: 16, overflow: 'hidden' }}
      >
        <View style={{ height: 130, backgroundColor: '#C8D2F0', padding: 14, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Capsule bg="rgba(255,255,255,0.65)" color={T.brand}><SF name="sparkles" size={11} color={T.brand} />AI-выбор для вас</Capsule>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 999, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
              <SF name="bookmark" size={14} color={T.brand} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <SF name="crown.fill" size={44} color={T.brand} />
            <Capsule bg="rgba(255,255,255,0.7)" color={T.label}><SF name="clock.fill" size={10} color={T.labelSecondary} />{featured.durationLabel}</Capsule>
          </View>
        </View>
        <View style={{ padding: 14 }}>
          <Text style={[ty.title3, { color: T.label }]}>{featured.title}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 3 }]}>{featured.author} · {featured.lessonsLabel} · {featured.level}</Text>
          <View style={{ height: 0.5, backgroundColor: T.separator, marginVertical: 12 }} />
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><SF name="star.fill" size={11} color={T.orange} /><Text style={[ty.caption1, { color: T.labelSecondary }]}>{featured.rating}</Text></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><SF name="person.3.fill" size={11} color={T.labelSecondary} /><Text style={[ty.caption1, { color: T.labelSecondary }]}>{featured.students} студентов</Text></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><SF name="target" size={11} color={T.brand} /><Text style={[ty.caption1, { color: T.brand }]}>Под профиль</Text></View>
          </View>
        </View>
      </Pressable>

      {/* AI promo */}
      <Pressable
        onPress={() => navigation.getParent()?.navigate('AITab')}
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
      <SectionHeader title="Каталог" action="Фильтры" onAction={() => navigation.navigate('Catalog')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 12, marginBottom: 20 }}>
        {grid.map((c) => {
          const p = progress(c.id);
          return (
            <Pressable key={c.id} onPress={() => navigation.navigate('CourseDetail', { courseId: c.id })}
              style={{ width: '47.6%', backgroundColor: T.cardBg, borderRadius: 14, overflow: 'hidden' }}>
              <View style={{ aspectRatio: 16 / 10, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
                <SF name={c.icon} size={36} color={c.iconColor} />
                <View style={{ position: 'absolute', top: 8, right: 8 }}>
                  <Capsule bg="rgba(255,255,255,0.75)" color={T.labelSecondary} style={{ paddingVertical: 2, paddingHorizontal: 7 }}>
                    {p > 0 ? `${Math.round(p * 100)}%` : 'Новое'}
                  </Capsule>
                </View>
              </View>
              <View style={{ padding: 12 }}>
                <Text style={[ty.footnoteEm, { color: T.label, lineHeight: 17 }]}>{c.title}</Text>
                <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 4 }]}>{c.lessonsLabel} · {c.level}</Text>
                {p > 0 ? <View style={{ marginTop: 8 }}><ProgressBar value={p} height={3} /></View> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
