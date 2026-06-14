import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavBarLarge } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { SiteCourseCard } from '../../components/SiteCourseCard';
import { T, ty } from '../../components/ui';
import { useCourses } from '../../state/CourseContext';
import { useMyCourses } from '../../state/useMyCourses';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'LMSHome'>;

export function LMSHomeScreen({ navigation }: Props) {
  const { courses, loading, source } = useCourses();
  const my = useMyCourses();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('Все');

  // owned course id -> server progress (0..100)
  const ownedProgress = useMemo(() => {
    const m: Record<string, number> = {};
    my.courses.forEach((c) => { m[c.id] = c.serverProgress ?? 0; });
    return m;
  }, [my.courses]);

  const categories = useMemo(() => {
    const set = Array.from(new Set(courses.map((c) => c.category).filter(Boolean)));
    return ['Все', ...set];
  }, [courses]);

  const filtered = useMemo(() => {
    return courses
      .filter((c) => cat === 'Все' || c.category === cat)
      .filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  }, [courses, cat, query]);

  return (
    <Screen>
      <NavBarLarge title="Обучение" />

      {/* Search */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск курса по названию"
          placeholderTextColor={T.labelTertiary}
          style={[ty.subhead, {
            flex: 1, height: 40, borderWidth: 1, borderColor: T.cardBorder, borderTopLeftRadius: 10, borderBottomLeftRadius: 10,
            paddingHorizontal: 12, color: T.label, backgroundColor: T.cardBg,
          }]}
        />
        <View style={{ width: 46, height: 40, borderTopRightRadius: 10, borderBottomRightRadius: 10, backgroundColor: T.sky, alignItems: 'center', justifyContent: 'center' }}>
          <SF name="magnifyingglass" size={18} color="#fff" />
        </View>
      </View>

      {/* Category pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingBottom: 14 }}>
        {categories.map((c) => {
          const on = cat === c;
          return (
            <Pressable key={c} onPress={() => setCat(c)} style={{
              paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1,
              borderColor: on ? 'rgba(7,89,133,0.15)' : T.cardBorder,
              backgroundColor: on ? T.skyBadgeBg : T.cardBg,
            }}>
              <Text style={[ty.subheadEm, { color: on ? T.skyDeep : T.label }]}>{c}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Sign-in prompt */}
      {!my.isSignedIn ? (
        <Pressable onPress={() => navigation.getParent()?.getParent()?.navigate('Auth' as never)}
          style={{ marginHorizontal: 16, marginBottom: 14, backgroundColor: T.skyBadgeBg, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <SF name="person.crop.circle" size={22} color={T.sky} />
          <Text style={[ty.subhead, { color: T.skyDeep, flex: 1 }]}>Войдите по почте, чтобы открыть свои курсы и видео</Text>
          <SF name="chevron.forward" size={14} color={T.sky} />
        </Pressable>
      ) : null}

      {loading ? (
        <View style={{ paddingTop: 60, alignItems: 'center' }}>
          <ActivityIndicator color={T.sky} />
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 12 }]}>Загружаем курсы…</Text>
        </View>
      ) : (
        <>
          {source === 'mock' ? (
            <Text style={[ty.caption1, { color: T.orange, paddingHorizontal: 20, paddingBottom: 8 }]}>Демо-режим · нет связи с сайтом</Text>
          ) : null}

          {/* Course grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16 }}>
            {filtered.map((c) => (
              <View key={c.id} style={{ width: '48.5%', marginBottom: 14 }}>
                <SiteCourseCard
                  course={c}
                  owned={c.id in ownedProgress}
                  progress={ownedProgress[c.id]}
                  onPress={() => navigation.navigate('CourseDetail', { courseId: c.id })}
                />
              </View>
            ))}
          </View>

          {filtered.length === 0 ? (
            <View style={{ padding: 30, alignItems: 'center' }}>
              <Text style={[ty.subhead, { color: T.labelSecondary }]}>Курсы не найдены</Text>
            </View>
          ) : null}
          <View style={{ height: 16 }} />
        </>
      )}
    </Screen>
  );
}
