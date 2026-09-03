import React, { useMemo, useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { PageIntro } from '../../components/PageIntro';
import { NavBarLarge } from '../../components/headers';
import { ResumeCallout } from '../../components/ResumeCallout';
import { SF } from '../../components/SFIcon';
import { Chip, SectionHeader } from '../../components/ui';
import { CourseCardPremium, FeaturedCard } from '../../components/CourseCardPremium';
import { CourseGridSkeleton, ListSkeleton, ErrorState, EmptyState } from '../../components/StateViews';
import { minTouch } from '../../theme/tokens';
import { useCourses } from '../../state/CourseContext';
import { useMyCourses } from '../../state/useMyCourses';
import { useNotifications } from '../../state/NotificationsContext';
import { useRole } from '../../state/useRole';
import { useLang, tr } from '../../state/LanguageContext';
import { useTalentProfile } from '../../state/useTalentProfile';
import { useDownloads } from '../../state/downloads';
import { useUser } from '@clerk/clerk-expo';
import { Logo } from '../../components/Logo';
import { LinearGradient } from 'expo-linear-gradient';
import { coursesWord, formatGiftDate } from '../../data/api';
import { LMSStackParams } from '../../navigation/types';
import { ProfileAvatarButton } from '../../components/ProfileAvatarButton';

type Props = NativeStackScreenProps<LMSStackParams, 'LMSHome'>;

export function LMSHomeScreen({ navigation }: Props) {
  const { T, ty } = useTheme();
  const { courses, loading, error, reload, source, progress } = useCourses();
  const my = useMyCourses();
  const { unread } = useNotifications();
  const { t } = useLang();
  const { feature, gift } = useRole();
  const { user } = useUser();
  const { profile, live } = useTalentProfile();
  const downloads = useDownloads();
  // Prefer a real name (Clerk → anketa full_name); email prefix only as a last resort.
  const displayName = user?.firstName || user?.fullName
    || (live && profile?.fullName ? profile.fullName.split(' ')[0] : null)
    || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || null;
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('Все');

  const ownedProgress = useMemo(() => {
    const m: Record<string, number> = {};
    my.courses.forEach((c) => { m[c.id] = Math.max(Math.round(c.serverProgress ?? 0), Math.round(progress(c.id) * 100)); });
    return m;
  }, [my.courses, progress]);

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

  // Стартовая акция: показываем, только если она идёт и этот аккаунт под неё
  // подходит. Нажатие ведёт в первый подаренный курс.
  const giftCourseId = gift.active && gift.eligible ? gift.courseIds[0] ?? null : null;
  const giftSubtitle = useMemo(() => {
    const n = gift.courseIds.length;
    const line = `${coursesWord(n)} ${n === 1 ? 'открыт' : 'открыты'} бесплатно`;
    const date = formatGiftDate(gift.until);
    return date ? `${line} — до ${date}` : line;
  }, [gift.courseIds.length, gift.until]);

  return (
    <Screen largeTitle={t('tab_learn')} onRefresh={async () => { await Promise.all([reload(), my.reload()]); }}>
      <PageIntro page="lms" />
      <NavBarLarge title={t('tab_learn')} trailing={<ProfileAvatarButton onPress={() => navigation.getParent()?.navigate('ProfileTab' as never)} />} />

      <View style={{ paddingHorizontal: 16 }}>
        <ResumeCallout />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Logo size={36} />
        <View style={{ flex: 1 }}>
          <Text style={[ty.footnote, { color: T.labelSecondary, letterSpacing: 0.2 }]} numberOfLines={1}>
            {displayName ? `Привет, ${displayName}` : 'Divergents'}
          </Text>
          <Text style={[ty.headline, { color: T.label, marginTop: 2 }]} numberOfLines={1}>
            {/* «non-stop development» — часть логотипа (она же на заставке),
                поэтому не переводится и не склоняется. */}
            {courses.length ? `${coursesWord(courses.length)} · non-stop development` : 'Non-stop development'}
          </Text>
        </View>
      </View>

      {downloads.items.length > 0 ? (
        <Pressable
          onPress={() => navigation.navigate('Downloads')}
          style={({ pressed }) => ({ marginHorizontal: 16, marginBottom: 14, borderRadius: 16, backgroundColor: T.brandTinted, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}>
          <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
            <SF name="arrow.down.circle" size={21} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: T.label }]}>{tr('Скачанные уроки')}</Text>
            <Text style={[ty.footnote, { color: T.labelSecondary, marginTop: 1 }]}>{downloads.items.length} · {tr('доступны без интернета')}</Text>
          </View>
          <SF name="chevron.right" size={15} color={T.labelTertiary} />
        </Pressable>
      ) : null}

      {/* Search (iOS fill style) */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.fillTertiary, borderRadius: 12, paddingLeft: 12, paddingRight: query ? 0 : 12, minHeight: minTouch }}>
          <SF name="magnifyingglass" size={16} color={T.labelSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('search_course')}
            placeholderTextColor={T.labelTertiary}
            accessibilityLabel={t('search_course')}
            style={[ty.body, { flex: 1, color: T.label, paddingVertical: 0, minHeight: minTouch }]}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Очистить поиск"
              style={({ pressed }) => ({ width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
              <SF name="xmark.circle.fill" size={17} color={T.labelTertiary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
        {categories.map((c) => <Chip key={c} label={c} active={cat === c} onPress={() => setCat(c)} />)}
      </ScrollView>

      {/* Подарочные курсы стартовой акции. Отдельного фича-флага у баннера нет:
          он часть «Обучения» и исчезает вместе с разделом. */}
      {giftCourseId ? (
      <Pressable onPress={() => navigation.navigate('CourseDetail', { courseId: giftCourseId })}
        accessibilityRole="button" accessibilityLabel={`Подарок новым участникам. ${giftSubtitle}`}
        style={({ pressed }) => ({ marginHorizontal: 16, marginBottom: 18, borderRadius: 16, overflow: 'hidden', opacity: pressed ? 0.7 : 1 })}>
        <LinearGradient colors={[T.brandTintedStrong, T.brandTinted]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
            <SF name="gift.fill" size={23} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>Подарок новым участникам</Text>
            <Text style={[ty.footnote, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={2}>{giftSubtitle}</Text>
          </View>
          <SF name="chevron.right" size={15} color={T.labelTertiary} />
        </LinearGradient>
      </Pressable>
      ) : null}

      {/* Books library entry — compact card with a gradient background.
          Раздел можно выключить в админ-панели сайта. */}
      {feature('books') ? (
      <Pressable onPress={() => navigation.navigate('Books')}
        accessibilityRole="button" accessibilityLabel="Библиотека книг" accessibilityHint="Каталог, рецензии и ИИ-советник по книгам"
        style={({ pressed }) => ({ marginHorizontal: 16, marginBottom: 18, borderRadius: 16, overflow: 'hidden', opacity: pressed ? 0.7 : 1 })}>
        <LinearGradient colors={[T.brandTintedStrong, T.brandTinted]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
            <SF name="book.fill" size={23} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>Библиотека книг</Text>
            <Text style={[ty.footnote, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={2}>Каталог, рецензии и ИИ-советник по книгам под ваш профиль</Text>
          </View>
          <SF name="chevron.right" size={15} color={T.labelTertiary} />
        </LinearGradient>
      </Pressable>
      ) : null}

      {loading ? (
        <View style={{ paddingTop: 8 }}><CourseGridSkeleton count={4} /></View>
      ) : error && courses.length === 0 ? (
        <ErrorState onRetry={reload} />
      ) : (
        <>
          {source === 'mock' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginHorizontal: 20, marginBottom: 12, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(255,149,0,0.12)' }}>
              <SF name="wifi.slash" size={11} color={T.orangeText} />
              <Text style={[ty.caption2Em, { color: T.orangeText }]} numberOfLines={1}>{t('demo_mode')}</Text>
            </View>
          ) : null}

          {/* «Мои курсы» still loading: hold the space with a skeleton so the
              catalog below doesn't jump down once the owned list arrives. */}
          {showSearch && my.isSignedIn && my.loading && !my.ready ? (
            <View style={{ marginBottom: 18 }}>
              <SectionHeader title={t('my_courses')} />
              <ListSkeleton rows={2} />
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
                showPrice={feature('purchases')}
                onPress={() => navigation.navigate('CourseDetail', { courseId: featured.id })}
              />
            </View>
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
                  showPrice={feature('purchases')}
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
