import React, { useMemo, useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
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
import { useLang, tr } from '../../state/LanguageContext';
import { useUser } from '@clerk/clerk-expo';
import { Logo } from '../../components/Logo';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'LMSHome'>;

export function LMSHomeScreen({ navigation }: Props) {
  const { T } = useTheme();
  const { courses, loading, error, reload, source, progress } = useCourses();
  const my = useMyCourses();
  const { unread } = useNotifications();
  const { t } = useLang();
  const { user } = useUser();
  const displayName = user?.firstName || user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || null;
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('Все');

  const ownedProgress = useMemo(() => {
    const m: Record<string, number> = {};
    my.courses.forEach((c) => { m[c.id] = Math.max(Math.round(c.serverProgress ?? 0), Math.round(progress(c.id) * 100)); });
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
    <Screen largeTitle={t('tab_learn')} onRefresh={async () => { await Promise.all([reload(), my.reload()]); }}>
      <NavBarLarge title={t('tab_learn')} trailing={<HeaderIcon name="bell.fill" color={T.brand} badge={unread} onPress={() => navigation.getParent()?.getParent()?.navigate('Notifications' as never)} />} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Logo size={36} />
        <View style={{ flex: 1 }}>
          <Text style={[ty.footnote, { color: T.labelSecondary, letterSpacing: 0.2 }]} numberOfLines={1}>
            {displayName ? `Привет, ${displayName}` : 'Divergents'}
          </Text>
          <Text style={[ty.headline, { color: T.label, marginTop: 2 }]} numberOfLines={1}>
            {courses.length ? `${courses.length} курсов · non-stop development` : 'Non-stop development'}
          </Text>
        </View>
      </View>

      {/* Search (iOS fill style) */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.fillTertiary, borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
          <SF name="magnifyingglass" size={16} color={T.labelSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('search_course')}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginHorizontal: 20, marginBottom: 12, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(255,149,0,0.12)' }}>
              <SF name="wifi.slash" size={11} color={T.orange} />
              <Text style={[ty.caption2Em, { color: T.orange }]}>{t('demo_mode')}</Text>
            </View>
          ) : null}

          {/* Continue (owned, in progress) */}
          {showSearch && continueCourse ? (
            <View style={{ marginBottom: 18 }}>
              <SectionHeader title={t('continue_')} />
              <FeaturedCard
                course={continueCourse}
                owned
                progress={Math.max(Math.round(continueCourse.serverProgress ?? 0), Math.round(progress(continueCourse.id) * 100))}
                eyebrow={tr('Продолжить')}
                onPress={() => navigation.navigate('CourseDetail', { courseId: continueCourse.id })}
              />
            </View>
          ) : null}

          {/* My courses */}
          {showSearch && my.isSignedIn && my.courses.length > 0 ? (
            <View style={{ marginBottom: 18 }}>
              <SectionHeader title={t('my_courses')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
                {my.courses.map((c) => (
                  <CourseCardPremium key={c.id} course={c} owned progress={Math.max(Math.round(c.serverProgress ?? 0), Math.round(progress(c.id) * 100))} width={250}
                    onPress={() => navigation.navigate('CourseDetail', { courseId: c.id })} />
                ))}
              </ScrollView>
            </View>
          ) : showSearch && my.isSignedIn && my.error && my.courses.length === 0 ? (
            <View style={{ marginBottom: 18 }}>
              <SectionHeader title={t('my_courses')} />
              <ErrorState message="Не удалось загрузить ваши курсы. Проверьте подключение." onRetry={my.reload} />
            </View>
          ) : null}

          {/* Featured (when nothing to continue) */}
          {showSearch && featured ? (
            <View style={{ marginBottom: 18 }}>
              <SectionHeader title={t('recommended')} />
              <FeaturedCard
                course={featured}
                onPress={() => navigation.navigate('CourseDetail', { courseId: featured.id })}
              />
            </View>
          ) : null}

{/* All courses grid */}
          <SectionHeader title={cat === 'Все' && !query ? 'Все курсы' : `Найдено: ${filtered.length}`} action="Каталог" onAction={() => navigation.navigate('Catalog')} />
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
            courses.length === 0 ? (
              <EmptyState icon="book" title="Курсы скоро появятся" subtitle="Каталог обновляется — загляните чуть позже." />
            ) : (
              <EmptyState icon="magnifyingglass" title={t('not_found_title')} subtitle={t('not_found_sub')} />
            )
          ) : null}
          <View style={{ height: 16 }} />
        </>
      )}
    </Screen>
  );
}
