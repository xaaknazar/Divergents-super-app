import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Image, ScrollView, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavBarLarge, HeaderIcon } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { ProgressBar, Chip, ListSection, T, ty } from '../../components/ui';
import { useCourses } from '../../state/CourseContext';
import { formatPrice } from '../../data/api';
import { Course } from '../../data/courses';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'Catalog'>;

function Cover({ course }: { course: Course }) {
  if (course.imageUrl) {
    return <Image source={{ uri: course.imageUrl }} style={{ width: 64, height: 64, borderRadius: 12 }} resizeMode="cover" />;
  }
  return (
    <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: course.tint, alignItems: 'center', justifyContent: 'center' }}>
      <SF name={course.icon} size={30} color={course.iconColor} />
    </View>
  );
}

export function CatalogScreen({ navigation }: Props) {
  const { courses, loading, progress } = useCourses();
  const [cat, setCat] = useState(0);

  const categories = useMemo(() => {
    const set = Array.from(new Set(courses.map((c) => c.category).filter(Boolean)));
    return ['Все', ...set];
  }, [courses]);

  const filtered = useMemo(() => {
    if (cat === 0) return courses;
    return courses.filter((c) => c.category === categories[cat]);
  }, [cat, courses, categories]);

  const inProgress = courses.filter((c) => progress(c.id) > 0 && progress(c.id) < 1).length;
  const done = courses.filter((c) => progress(c.id) >= 1).length;
  const strip = [
    { v: String(courses.length), l: 'Курсов' },
    { v: String(inProgress), l: 'В работе' },
    { v: String(done), l: 'Завершено' },
  ];

  return (
    <Screen>
      <NavBarLarge title="Каталог" trailing={<>
        <HeaderIcon name="magnifyingglass" />
        <HeaderIcon name="list.bullet" />
      </>} />

      {loading ? (
        <View style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={T.brand} /></View>
      ) : (
        <>
          {/* Category chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
            {categories.map((c, i) => (
              <Chip key={c} label={c} active={cat === i} onPress={() => setCat(i)} />
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
          <ListSection header={cat === 0 ? 'Все курсы' : categories[cat]}>
            {filtered.map((c, i) => {
              const p = progress(c.id);
              return (
                <Pressable key={c.id} onPress={() => navigation.navigate('CourseDetail', { courseId: c.id })}
                  style={({ pressed }) => ({ flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'flex-start', opacity: pressed ? 0.6 : 1 })}>
                  <Cover course={c} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[ty.headline, { color: T.label, lineHeight: 20 }]} numberOfLines={2}>{c.title}</Text>
                    <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>{c.category}</Text>
                    <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{c.lessonsLabel} · {formatPrice(c.price)}</Text>
                    {p > 0 ? (
                      <View style={{ marginTop: 8 }}>
                        <ProgressBar value={p} height={3} />
                        <Text style={[ty.caption2, { color: T.brand, marginTop: 4 }]}>{Math.round(p * 100)}% завершено</Text>
                      </View>
                    ) : null}
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
          <View style={{ height: 20 }} />
        </>
      )}
    </Screen>
  );
}
