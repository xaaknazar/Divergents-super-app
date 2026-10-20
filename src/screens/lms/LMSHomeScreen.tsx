import React, { useMemo, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { PageIntro } from '../../components/PageIntro';
import { NavBarLarge } from '../../components/headers';
import { ResumeCallout } from '../../components/ResumeCallout';
import { SectionHeader } from '../../components/ui';
import { SearchField } from '../../components/SearchField';
import { ChipRail } from '../../components/ChipRail';
import { FeaturedCard } from '../../components/FeaturedCard';
import { CourseCatalogGrid } from '../../components/CourseCatalogGrid';
import { OwnedCourseShelf } from '../../components/OwnedCourseShelf';
import { LearningResumeCard } from '../../components/LearningResumeCard';
import { ShortcutTile } from '../../components/ShortcutTile';
import { LearningShortcut } from '../../components/LearningShortcut';
import { Wrapper } from '../../components/Wrapper';
import { StatusBadge } from '../../components/StatusBadge';
import { CourseGridSkeleton, ListSkeleton, ErrorState, EmptyState } from '../../components/StateViews';
import { useCourses } from '../../state/CourseContext';
import { useMyCourses } from '../../state/useMyCourses';
import { useRole } from '../../state/useRole';
import { useLang } from '../../state/LanguageContext';
import { useTalentProfile } from '../../state/useTalentProfile';
import { useDownloads } from '../../state/downloads';
import { useUser } from '@clerk/clerk-expo';
import { coursesWord, formatGiftDate } from '../../data/api';
import { lessons as lessonsWord } from '../../data/plural';
import { LMSStackParams } from '../../navigation/types';
import { ProfileAvatarButton } from '../../components/ProfileAvatarButton';
import { useProfileButton } from '../../state/useProfileButton';

type Props = NativeStackScreenProps<LMSStackParams, 'LMSHome'>;

export function LMSHomeScreen({ navigation }: Props) {
  const { courses, loading, error, reload, source, progress, currentLessonIndex } = useCourses();
  const my = useMyCourses();
  const { t } = useLang();
  const { feature, gift } = useRole();
  const { user } = useUser();
  const { profile, live } = useTalentProfile();
  const downloads = useDownloads();
  const profileButton = useProfileButton();
  // Prefer a real name (Clerk → anketa full_name); email prefix only as a last resort.
  const displayName = user?.firstName || user?.fullName
    || (live && profile?.fullName ? profile.fullName.split(' ')[0] : null)
    || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || null;
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const hello = h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
    return displayName ? `${hello}, ${displayName}` : hello;
  }, [displayName]);
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

  // «Урок 15 из 34 · Название» — только если текущий урок известен из каталога; иначе категория.
  const continueCaption = useMemo(() => {
    if (!continueCourse) return null;
    const lessons = courses.find((c) => c.id === continueCourse.id)?.lessons ?? continueCourse.lessons;
    const index = currentLessonIndex?.(continueCourse.id) ?? -1;
    const lesson = index >= 0 ? lessons[index] : undefined;
    if (lesson) return `Урок ${index + 1} из ${lessons.length} · ${lesson.title}`;
    const count = continueCourse.chaptersCount ?? continueCourse.lessons.length;
    return [continueCourse.category, count ? lessonsWord(count) : null].filter(Boolean).join(' · ');
  }, [continueCourse, courses, currentLessonIndex]);

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
    <Screen largeTitle={t('tab_learn')} backdrop="learn" onRefresh={async () => { await Promise.all([reload(), my.reload()]); }}>
      <PageIntro page="lms" />
      <NavBarLarge title={t('tab_learn')} subtitle={greeting} trailing={<ProfileAvatarButton {...profileButton} onPress={() => navigation.getParent()?.navigate('ProfileTab' as never)} />} />
      <Wrapper paddingHorizontal={16} paddingTop={8} gap={16}>
        {/* Поиск один на странице: каталог ниже фильтруется этим же полем. */}
        <SearchField surface="raised" value={query} onChangeText={setQuery} placeholder={t('search_course')} />
        {!loading && !(error && courses.length === 0) && showSearch && continueCourse ? (
          <LearningResumeCard title={continueCourse.title} caption={continueCaption} imageUrl={continueCourse.imageUrl} icon={continueCourse.icon}
            progress={Math.max(Math.round(continueCourse.serverProgress ?? 0), Math.round(progress(continueCourse.id) * 100))}
            onPress={() => navigation.navigate('CourseDetail', { courseId: continueCourse.id })} />
        ) : null}
        <Wrapper dir="row" gap={12} align="stretch">
          <Wrapper flex={1}>
            <ShortcutTile icon="arrow.down.circle.fill" title="Скачанные" caption="Уроки без интернета"
              count={downloads.items.length > 0 ? downloads.items.length : null} onPress={() => navigation.navigate('Downloads')} />
          </Wrapper>
          {feature('books') ? <Wrapper flex={1}>
            <ShortcutTile icon="books.vertical.fill" tone="violet" title="Библиотека" caption="Книги и ИИ-советник" onPress={() => navigation.navigate('Books')} />
          </Wrapper> : null}
        </Wrapper>
        {giftCourseId ? (
          <LearningShortcut kind="gift" subtitle={giftSubtitle} onPress={() => navigation.navigate('CourseDetail', { courseId: giftCourseId })} />
        ) : null}
        <ResumeCallout />
      </Wrapper>
      {loading ? (
        <Wrapper paddingTop={8}><CourseGridSkeleton count={4} /></Wrapper>
      ) : error && courses.length === 0 ? (
        <ErrorState onRetry={reload} />
      ) : (
        <>
          {source === 'mock' ? (
            <Wrapper marginHorizontal={20} marginBottom={12} alignSelf="flex-start">
              <StatusBadge label={t('demo_mode')} icon="wifi.slash" tone="warning" size="compact" />
            </Wrapper>
          ) : null}
          {showSearch && my.isSignedIn && my.loading && !my.ready ? (
            <Wrapper marginBottom={18}>
              <SectionHeader title={t('my_courses')} />
              <Wrapper marginHorizontal={16}><ListSkeleton rows={2} /></Wrapper>
            </Wrapper>
          ) : null}
          {showSearch && my.isSignedIn && my.courses.length > 0 ? (
            <Wrapper paddingTop={12}>
              <SectionHeader title={t('my_courses')} />
              <OwnedCourseShelf courses={my.courses} progress={ownedProgress}
                onCoursePress={courseId => navigation.navigate('CourseDetail', { courseId })} />
            </Wrapper>
          ) : showSearch && my.isSignedIn && my.error && my.courses.length === 0 ? (
            <Wrapper marginBottom={18}>
              <SectionHeader title={t('my_courses')} />
              <ErrorState message="Не удалось загрузить ваши курсы. Проверьте подключение." onRetry={my.reload} />
            </Wrapper>
          ) : null}
          {showSearch && featured ? (
            <Wrapper marginBottom={18}>
              <SectionHeader title={t('recommended')} />
              <Wrapper marginHorizontal={16}>
                <FeaturedCard course={featured} showPrice={feature('purchases')}
                  onPress={() => navigation.navigate('CourseDetail', { courseId: featured.id })} />
              </Wrapper>
            </Wrapper>
          ) : null}
          <SectionHeader title={cat === 'Все' && !query ? 'Все курсы' : `Найдено: ${filtered.length}`} />
          {categories.length > 1 ? (
            <ChipRail items={categories.map((c) => ({ key: c, label: c, active: c === cat, onPress: () => setCat(c) }))} />
          ) : null}
          <Wrapper paddingTop={16} />
          <CourseCatalogGrid courses={filtered} ownedProgress={ownedProgress} showPrice={feature('purchases')}
            onCoursePress={courseId => navigation.navigate('CourseDetail', { courseId })} />
          {filtered.length === 0 ? (
            courses.length === 0 ? (
              <EmptyState icon="book" title="Курсы скоро появятся" subtitle="Каталог обновляется — загляните чуть позже." />
            ) : (
              <EmptyState icon="magnifyingglass" title={t('not_found_title')} subtitle={t('not_found_sub')} actionLabel="Сбросить поиск и фильтр" onAction={() => { setQuery(''); setCat('Все'); }} />
            )
          ) : null}
          <Wrapper paddingTop={24} />
        </>
      )}
    </Screen>
  );
}
