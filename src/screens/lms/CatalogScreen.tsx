import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavBarLarge, HeaderIcon } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { ProgressBar, Chip, ListSection, ListRow, IconSquircle, T, ty } from '../../components/ui';
import { useCourses, COURSES } from '../../state/CourseContext';
import { CATALOG_CATEGORIES, CATALOG_TOPICS } from '../../data/courses';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'Catalog'>;

export function CatalogScreen({ navigation }: Props) {
  const { progress } = useCourses();
  const [cat, setCat] = useState(0);

  const filtered = useMemo(() => {
    const list = [...COURSES];
    if (cat === 0) return list.sort((a, b) => b.match - a.match); // "Под профиль"
    const name = CATALOG_CATEGORIES[cat];
    return list.filter((c) => c.category === name).sort((a, b) => b.match - a.match);
  }, [cat]);

  const inProgress = COURSES.filter((c) => progress(c.id) > 0 && progress(c.id) < 1).length;
  const done = COURSES.filter((c) => progress(c.id) >= 1).length;
  const strip = [
    { v: String(COURSES.length), l: 'Курсов' },
    { v: String(inProgress), l: 'В работе' },
    { v: String(done), l: 'Завершено' },
  ];

  return (
    <Screen>
      <NavBarLarge title="Каталог" trailing={<>
        <HeaderIcon name="magnifyingglass" />
        <HeaderIcon name="list.bullet" />
      </>} />

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.fillTertiary, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10 }}>
          <SF name="magnifyingglass" size={16} color={T.labelSecondary} />
          <Text style={[ty.body, { color: T.labelTertiary }]}>19 курсов · 206 уроков</Text>
        </View>
      </View>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
        {CATALOG_CATEGORIES.map((c, i) => (
          <Chip key={c} label={c} active={cat === i} icon={i === 0 ? 'sparkles' : undefined} onPress={() => setCat(i)} />
        ))}
      </ScrollView>

      {/* Stats strip */}
      <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: T.cardBg, borderRadius: 14, flexDirection: 'row', paddingVertical: 12 }}>
        {strip.map((s, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < strip.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
            <Text style={[ty.title3, { color: T.label }]}>{s.v}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* Course rows */}
      <ListSection header={cat === 0 ? 'Под ваш профиль · отсортировано' : CATALOG_CATEGORIES[cat]}>
        {filtered.map((c, i) => {
          const p = progress(c.id);
          return (
            <Pressable key={c.id} onPress={() => navigation.navigate('CourseDetail', { courseId: c.id })}
              style={({ pressed }) => ({ flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'flex-start', opacity: pressed ? 0.6 : 1 })}>
              <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
                <SF name={c.icon} size={30} color={c.iconColor} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Text style={[ty.headline, { color: T.label, flex: 1, lineHeight: 20 }]}>{c.title}</Text>
                  <Text style={[ty.caption2Em, { color: T.brand, backgroundColor: T.brandTinted, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6, overflow: 'hidden' }]}>{c.match}%</Text>
                </View>
                <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>{c.author}</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{c.lessonsLabel} · {c.durationLabel} · {c.level}</Text>
                {p > 0 ? (
                  <View style={{ marginTop: 8 }}>
                    <ProgressBar value={p} height={3} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={[ty.caption2, { color: T.brand }]}>{Math.round(p * 100)}% завершено</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <SF name="star.fill" size={9} color={T.orange} />
                        <Text style={[ty.caption2, { color: T.labelSecondary }]}>{c.rating} · {c.students}</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <SF name="star.fill" size={9} color={T.orange} />
                      <Text style={[ty.caption2, { color: T.labelSecondary }]}>{c.rating}</Text>
                    </View>
                    <Text style={[ty.caption2, { color: T.labelSecondary }]}>{c.students} студентов</Text>
                  </View>
                )}
              </View>
              {i < filtered.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 92, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
            </Pressable>
          );
        })}
        {filtered.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={[ty.subhead, { color: T.labelSecondary }]}>Нет курсов в этой категории</Text>
          </View>
        ) : null}
      </ListSection>

      {/* Topics */}
      <ListSection header="Темы">
        {CATALOG_TOPICS.map((t, i) => (
          <ListRow key={t.title} leading={<IconSquircle icon={t.icon} bg={t.bg} size={30} />} title={t.title} detail={t.detail} chevron last={i === CATALOG_TOPICS.length - 1} />
        ))}
      </ListSection>
      <View style={{ height: 20 }} />
    </Screen>
  );
}
