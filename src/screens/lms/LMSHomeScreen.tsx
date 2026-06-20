import React, { useMemo, useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavBarLarge, HeaderIcon } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { Chip, SectionHeader, ty } from '../../components/ui';
import { CourseCardPremium, FeaturedCard } from '../../components/CourseCardPremium';
import { CourseGridSkeleton, ErrorState, EmptyState } from '../../components/StateViews';
import { useCourses } from '../../state/CourseContext';
import { useMyCourses } from '../../state/useMyCourses';
import { useNotifications } from '../../state/NotificationsContext';
import { useUser } from '@clerk/clerk-expo';
import { Logo } from '../../components/Logo';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'LMSHome'>;

export function LMSHomeScreen({ navigation }: Props) {
  const { T } = useTheme();
  const { courses, loading, error, reload, source } = useCourses();
  const my = useMyCourses();
  const { unread } = useNotifications();
  const { user } = useUser();
  const displayName = user?.firstName || user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || null;
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('Все');

  const ownedProgress = useMemo(() => {
    const m: Record<string, number> = {};
    my.courses.forEach((c) => { m[c.id] = c.serverProgress ?? 0; });
    return m;
  }, [my.courses]);

  const categories = useMemo(
    () => ['Все', ...Array.from(new Set(courses.map((c) => c.category).filter(Boolean)))],
    [courses]
  );

  const filtered = useMemo(() => (
    courses
      .filter((c) => cat === 'Все' || c.category === cat)
      .filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
  ), [courses, cat, query]);

  // Continue: an owned course in progress (highest progress under 100)
  const continueCourse = useMemo(() => {
    const inProgress = my.courses
      .filter((c) => (c.serverProgress ?? 0) > 0 && (c.serverProgress ?? 0) < 100)
      .sort((a, b) => (b.serverProgress ?? 0) - (a.serverProgress ?? 0));
    return inProgress[0] ?? null;
  }, [my.courses]);

  // Featured (when there's nothing to continue): a catalog course with a cover
  const featured = useMemo(
    () => (continueCourse ? null : courses.find((c) => c.imageUrl) ?? courses[0] ?? null),
    [courses, continueCourse]
  );

  const showSearch = !query && cat === 'Все';

  return (
    <Screen largeTitle="Обучение" onRefresh={async () => { reload(); await my.reload(); }}>
      <NavBarLarge title="Обучение" trailing={<HeaderIcon name="bell.fill" badge={unread} onPress={() => navigation.getParent()?.getParent()?.navigate('Notifications' as never)} />} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 14 }}>
        <Logo size={34} />
        <View style={{ flex: 1 }}>
          <Text style={[ty.callout, { color: T.labelSecondary }]} numberOfLines={1}>
            {displayName ? `Привет, ${displayName}` : 'Divergents'}
          </Text>
          <Text style={[ty.headline, { color: T.label, marginTop: 1 }]} numberOfLines={1}>
            {courses.length ? `${courses.length} курсов · non-stop development` : 'Non-stop development'}
          </Text>
        </View>
      </View>

      {/* Search (iOS fill style) */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.fillTertiary, borderRadius: 12, paddingHorizontal: 12, height: 40 }}>
          <SF name="magnifyingglass" size={16} color={T.labelSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Поиск курса"
            placeholderTextColor={T.labelTertiary}
            style={[ty.body, { flex: 1, color: T.label, paddingVertical: 0 }]}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}><SF name="xmark" size={15} color={T.labelTertiary} /></Pressable>
          ) : null}
        </View>
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
        {categories.map((c) => <Chip key={c} label={c} active={cat === c} onPress={() => setCat(c)} />)}
      </ScrollView>

      {loading ? (
        <View style={{ paddingTop: 8 }}><CourseGridSkeleton count={4} /></View>
      ) : error && courses.length === 0 ? (
        <ErrorState onRetry={reload} />
      ) : (
        <>
          {source === 'mock' ? (
            <Text style={[ty.caption1, { color: T.orange, paddingHorizontal: 20, paddingBottom: 8 }]}>Демо-режим · нет связи с сайтом</Text>
          ) : null}

          {/* Continue (owned, in progress) */}
          {showSearch && continueCourse ? (
            <View style={{ marginBottom: 18 }}>
              <SectionHeader title="Продолжить" />
              <FeaturedCard
                course={continueCourse}
                owned
                progress={continueCourse.serverProgress}
                eyebrow="Продолжить"
                onPress={() => navigation.navigate('CourseDetail', { courseId: continueCourse.id })}
              />
            </View>
          ) : null}

          {/* My courses */}
          {showSearch && my.isSignedIn && my.courses.length > 0 ? (
            <View style={{ marginBottom: 18 }}>
              <SectionHeader title="Мои курсы" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
                {my.courses.map((c) => (
                  <CourseCardPremium key={c.id} course={c} owned progress={c.serverProgress} width={250}
                    onPress={() => navigation.navigate('CourseDetail', { courseId: c.id })} />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Featured (when nothing to continue) */}
          {showSearch && featured ? (
            <View style={{ marginBottom: 18 }}>
              <SectionHeader title="Рекомендуем" />
              <FeaturedCard
                course={featured}
                onPress={() => navigation.navigate('CourseDetail', { courseId: featured.id })}
              />
            </View>
          ) : null}

          {/* Sign-in prompt */}
          {showSearch && !my.isSignedIn ? (
            <Pressable onPress={() => navigation.getParent()?.getParent()?.navigate('Auth' as never)}
              style={{ marginHorizontal: 16, marginBottom: 18, backgroundColor: T.brandTinted, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(35,64,136,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <SF name="person.crop.circle" size={22} color={T.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ty.headline, { color: T.label }]}>Войдите по почте</Text>
                <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 1 }]}>Откроются ваши курсы и видео</Text>
              </View>
              <SF name="chevron.forward" size={14} color={T.brand} />
            </Pressable>
          ) : null}

          {/* All courses grid */}
          <SectionHeader title={cat === 'Все' && !query ? 'Все курсы' : `Найдено: ${filtered.length}`} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16 }}>
            {filtered.map((c) => (
              <View key={c.id} style={{ width: '48.5%', marginBottom: 14 }}>
                <CourseCardPremium
                  course={c}
                  owned={c.id in ownedProgress}
                  progress={ownedProgress[c.id]}
                  onPress={() => navigation.navigate('CourseDetail', { courseId: c.id })}
                />
              </View>
            ))}
          </View>
          {filtered.length === 0 ? (
            <EmptyState icon="magnifyingglass" title="Курсы не найдены" subtitle="Попробуйте изменить запрос или категорию." />
          ) : null}
          <View style={{ height: 16 }} />
        </>
      )}
    </Screen>
  );
}
