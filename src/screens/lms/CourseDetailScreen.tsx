import React, { useEffect } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Share, Alert } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../../components/SFIcon';
import { NavHeader, NavRoundButton } from '../../components/NavHeader';
import { ProgressBar, Capsule, ListSection, PrimaryButton, ty } from '../../components/ui';
import { shadows } from '../../theme/tokens';
import { ErrorState, EmptyState } from '../../components/StateViews';
import { useEnrollment } from '../../state/EnrollmentContext';
import { useCourses } from '../../state/CourseContext';
import { useMyCourses } from '../../state/useMyCourses';
import { useAuth } from '@clerk/clerk-expo';
import { stripHtml, API_BASE, imgUrl } from '../../data/api';
import { Course } from '../../data/courses';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'CourseDetail'>;
type Nav = Props['navigation'];

// Floating translucent header over the course hero image (dark scrim buttons).
function HeroNav({ course, courseId, navigation }: { course: Course; courseId: string; navigation: Nav }) {
  const { has, toggle } = useEnrollment();
  const bookmarked = has(`bookmark:${courseId}`);
  return (
    <NavHeader
      variant="overlay"
      overlayScheme="dark"
      onBack={() => navigation.goBack()}
      trailing={
        <>
          <NavRoundButton icon="arrow.down.circle" scheme="dark" accessibilityLabel="Загрузки"
            onPress={() => navigation.navigate('Downloads')} />
          <NavRoundButton icon="square.and.arrow.up" scheme="dark" accessibilityLabel="Поделиться"
            onPress={() => Share.share({ message: `${course.title} — Divergents\n${API_BASE}/courses/${courseId}` })} />
          <NavRoundButton icon={bookmarked ? 'bookmark.fill' : 'bookmark'} scheme="dark" accessibilityLabel="В закладки"
            onPress={() => toggle(`bookmark:${courseId}`)} />
        </>
      }
    />
  );
}

export function CourseDetailScreen({ route, navigation }: Props) {
  const { T } = useTheme();
  useLang();
  const { courseId } = route.params;
  const { getCourse, loadDetail, loading, error, reload } = useCourses();
  const course = getCourse(courseId);
  const { isSignedIn, getToken } = useAuth();
  const my = useMyCourses();

  useEffect(() => {
    if (!course || course.source === 'mock') return;
    let active = true;
    (async () => {
      const token = isSignedIn ? await getToken() : null;
      if (active && (course.lessons.length === 0 || token)) await loadDetail(courseId, token);
    })();
    return () => { active = false; };
    // course?.id is essential for cold deep links: it changes once the catalog
    // arrives, while avoiding a loop when detail replaces the course object.
  }, [courseId, course?.id, course?.source, isSignedIn]);

  if (!course) {
    return (
      <View style={{ flex: 1, backgroundColor: T.systemBg }}>
        <NavHeader transparent hideBackLabel onBack={() => navigation.goBack()} />
        {loading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={T.brand} /></View>
        ) : (
          <ErrorState message={error ? 'Не удалось загрузить курс. Проверьте подключение.' : 'Курс не найден.'} onRetry={reload} />
        )}
      </View>
    );
  }

  const isFree = (course.price ?? 0) <= 0;
  // Ownership from the "Мои курсы" list OR confirmed by the owned-detail endpoint
  // (course.owned) — the latter survives a failed list fetch, so a purchased
  // course never wrongly drops to the "Buy" landing.
  const ownedByApi = my.courses.some((c) => c.id === courseId) || course.owned === true;
  // Free, owned, or local demo courses → learning view. Paid live courses you
  // don't own → sales/landing view.
  const owned = isFree || ownedByApi || course.source !== 'live';

  // Avoid the "not purchased" flash: wait until owned courses are resolved.
  if (!isFree && course.source === 'live' && my.isSignedIn && !my.ready) {
    return (
      <View style={{ flex: 1, backgroundColor: T.systemBg }}>
        <NavHeader transparent hideBackLabel onBack={() => navigation.goBack()} />
        <View style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={T.brand} /></View>
      </View>
    );
  }

  // Ownership genuinely unknown (the "Мои курсы" fetch failed and nothing local
  // confirms access). Showing the sales page here would tell a paying user to
  // buy the course again after a cold start with no connectivity.
  if (!owned && !isFree && course.source === 'live' && my.isSignedIn && my.error) {
    return (
      <View style={{ flex: 1, backgroundColor: T.systemBg }}>
        <NavHeader transparent hideBackLabel onBack={() => navigation.goBack()} />
        <ErrorState message={tr('Не удалось проверить доступ к курсу. Проверьте подключение и попробуйте снова.')} onRetry={() => my.reload()} />
      </View>
    );
  }

  return owned
    ? <OwnedCourse course={course} courseId={courseId} navigation={navigation} />
    : <SalesCourse course={course} courseId={courseId} navigation={navigation} />;
}

// ─── Owned / free course → learning page ───────────────────────────
function OwnedCourse({ course, courseId, navigation }: { course: Course; courseId: string; navigation: Nav }) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { detailLoading, progress, currentLessonIndex, lessonStatus } = useCourses();
  const p = progress(courseId);
  const curIdx = currentLessonIndex(courseId);
  // curIdx === -1 → every lesson is done. Re-entry starts the course over
  // instead of silently reopening the last lesson under a «Продолжить» label.
  const allDone = course.lessons.length > 0 && curIdx === -1;
  const curLesson = allDone ? course.lessons[0] : course.lessons[curIdx];
  const chaptersLoading = detailLoading[courseId] && course.lessons.length === 0;

  const meta = [
    { v: String(course.chaptersCount ?? course.lessons.length), l: tr('Уроков') },
    { v: `${Math.round(p * 100)}%`, l: tr('Пройдено') },
    { v: course.category, l: tr('Тема') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: T.systemBg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        <View style={{ height: 230 }}>
          {course.imageUrl
            ? <Image source={imgUrl(course.imageUrl, 1080)} style={{ position: 'absolute', width: '100%', height: 230 }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
            : <View style={{ position: 'absolute', width: '100%', height: 230, backgroundColor: course.tint }} />}
          <LinearGradient colors={['rgba(0,0,0,0.34)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)']} locations={[0, 0.45, 1]} style={{ position: 'absolute', width: '100%', height: 230 }} />
          <HeroNav course={course} courseId={courseId} navigation={navigation} />
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 20 }}>
            <Capsule bg="rgba(52,199,89,0.9)" color="#fff"><SF name="checkmark.seal.fill" size={11} color="#fff" />{tr('Курс открыт')}</Capsule>
            <Text style={[ty.title1, { color: '#fff', marginTop: 10 }]} numberOfLines={2}>{course.title}</Text>
            <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 2 }]} numberOfLines={1}>{course.author} · Divergents</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
          {meta.map((m, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', paddingHorizontal: 6, borderRightWidth: i < meta.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
              {/* Values like a category name ("Саморазвитие") must wrap, not clip. */}
              <Text style={[ty.headline, { color: T.label, textAlign: 'center' }]} numberOfLines={2}>{m.v}</Text>
              <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 1, textAlign: 'center' }]} numberOfLines={1}>{m.l}</Text>
            </View>
          ))}
        </View>

        {course.lessons.length > 0 ? (
          <View style={{ margin: 16, backgroundColor: T.cardBg, borderRadius: 16, padding: 16, ...shadows.card }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={[ty.body, { color: T.label }]} numberOfLines={1}>{tr('Ваш прогресс')}</Text>
              <Text style={[ty.title3, { color: T.brand }]} numberOfLines={1}>{Math.round(p * 100)}%</Text>
            </View>
            <View style={{ marginTop: 10 }}><ProgressBar value={p} /></View>
            {allDone ? (
              <Text style={[ty.subhead, { color: T.green, marginTop: 6 }]} numberOfLines={1}>{tr('Курс пройден')}</Text>
            ) : curLesson ? (
              <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 6 }]} numberOfLines={1}>{tr('Урок')} {curLesson.n} — {curLesson.title}</Text>
            ) : null}
            <PrimaryButton
              label={allDone ? tr('Пройти заново') : p > 0 ? tr('Продолжить') : tr('Начать курс')}
              icon={allDone ? 'arrow.clockwise' : 'play.fill'}
              style={{ marginTop: 14 }}
              onPress={() => curLesson && navigation.navigate('Video', { courseId, lessonId: curLesson.id })} />
          </View>
        ) : null}

        {chaptersLoading ? (
          <View style={{ paddingVertical: 30, alignItems: 'center' }}><ActivityIndicator color={T.brand} /></View>
        ) : (
          <ListSection header={tr('Программа курса')}>
            {course.lessons.map((l, i) => {
              const status = lessonStatus(courseId, i);
              const indicator = status === 'done'
                ? <SF name="checkmark.circle.fill" size={26} color={T.green} />
                : (
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: status === 'current' ? T.brand : T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[ty.footnoteEm, { color: status === 'current' ? '#fff' : T.labelSecondary }]} numberOfLines={1}>{l.n}</Text>
                  </View>
                );
              return (
                <Pressable key={l.id} onPress={() => navigation.navigate('Video', { courseId, lessonId: l.id })}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: status === 'current' ? T.brandTinted : 'transparent', opacity: pressed ? 0.6 : 1 })}>
                  {indicator}
                  <View style={{ flex: 1 }}>
                    <Text style={[ty.body, { color: T.label }]} numberOfLines={2}>{l.title}</Text>
                    <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>{status === 'done' ? 'Пройдено' : l.duration}</Text>
                  </View>
                  <SF name="play.circle.fill" size={22} color={T.brand} />
                  {i < course.lessons.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 54, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
                </Pressable>
              );
            })}
            {course.lessons.length === 0 ? <EmptyState icon="book" title={tr('Программа готовится')} subtitle={tr('Уроки этого курса скоро появятся здесь.')} /> : null}
          </ListSection>
        )}

        {stripHtml(course.description) ? (
          <ListSection header={tr('О курсе')}>
            <View style={{ padding: 16 }}><Text style={[ty.body, { color: T.label }]}>{stripHtml(course.description)}</Text></View>
          </ListSection>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ─── Locked / paid course → sales landing page ─────────────────────
function SalesCourse({ course, courseId, navigation }: { course: Course; courseId: string; navigation: Nav }) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { detailLoading } = useCourses();
  const freeLesson = course.lessons.find((l) => l.isFree);
  const chaptersLoading = detailLoading[courseId] && course.lessons.length === 0;

  const includes = [
    { icon: 'play.circle.fill', t: `${course.chaptersCount ?? course.lessons.length} видеоуроков` },
    { icon: 'doc.fill', t: tr('Материалы и конспекты') },
    { icon: 'person.3.fill', t: tr('Обсуждение с участниками') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: T.systemBg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + (freeLesson ? 100 : 30) }}>
        {/* Cover */}
        <View style={{ height: 300 }}>
          {course.imageUrl
            ? <Image source={imgUrl(course.imageUrl, 1080)} style={{ position: 'absolute', width: '100%', height: 300 }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
            : <View style={{ position: 'absolute', width: '100%', height: 300, backgroundColor: course.tint }} />}
          <LinearGradient colors={['rgba(0,0,0,0.40)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.62)']} locations={[0, 0.42, 1]} style={{ position: 'absolute', width: '100%', height: 300 }} />
          <HeroNav course={course} courseId={courseId} navigation={navigation} />
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 22 }}>
            <Capsule bg="rgba(255,255,255,0.9)" color={T.brand}>{course.category}</Capsule>
            <Text style={[ty.largeTitle, { color: '#fff', marginTop: 10 }]} numberOfLines={2}>{course.title}</Text>
            <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.92)', marginTop: 2 }]} numberOfLines={1}>{course.author} · Divergents</Text>
          </View>
        </View>

        {/* Курс без доступа. Ни цены, ни кнопки покупки: правила App Store
            запрещают продавать цифровой контент мимо встроенных покупок и
            подталкивать к оплате на стороне. Курсы открываются на сайте, и
            купленный курс здесь просто становится доступным. */}
        <View style={{ margin: 16, backgroundColor: T.cardBg, borderRadius: 18, padding: 18, ...shadows.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SF name="lock.fill" size={15} color={T.labelSecondary} />
            <Text style={[ty.title3, { color: T.label, flexShrink: 1 }]} numberOfLines={1}>{tr('Курс пока не открыт')}</Text>
          </View>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 6 }]}>
            {tr('Когда доступ будет открыт, курс появится в разделе «Мои курсы».')}
          </Text>
          {freeLesson ? (
            <PrimaryButton label={tr('Смотреть бесплатный урок')} icon="play.fill" color="transparent" style={{ marginTop: 8 }}
              onPress={() => navigation.navigate('Video', { courseId, lessonId: freeLesson.id })} />
          ) : null}
        </View>

        {/* About */}
        {stripHtml(course.description) ? (
          <ListSection header={tr('О курсе')}>
            <View style={{ padding: 16 }}><Text style={[ty.body, { color: T.label }]}>{stripHtml(course.description)}</Text></View>
          </ListSection>
        ) : null}

        {/* What's included */}
        <ListSection header={tr('Что входит')}>
          {includes.map((it, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
              <SF name={it.icon} size={20} color={T.brand} />
              <Text style={[ty.body, { color: T.label, flex: 1 }]} numberOfLines={1}>{it.t}</Text>
              {i < includes.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 48, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
            </View>
          ))}
        </ListSection>

        {/* Program preview */}
        {chaptersLoading ? (
          <View style={{ paddingVertical: 30, alignItems: 'center' }}><ActivityIndicator color={T.brand} /></View>
        ) : course.lessons.length > 0 ? (
          <ListSection header={`Программа · ${course.lessons.length} уроков`}>
            {course.lessons.map((l, i) => {
              const free = l.isFree === true;
              return (
                <Pressable key={l.id} disabled={!free}
                  onPress={() => free && navigation.navigate('Video', { courseId, lessonId: l.id })}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, opacity: pressed ? 0.6 : 1 })}>
                  {free
                    ? <SF name="play.circle.fill" size={24} color={T.brand} />
                    : <SF name="lock.fill" size={20} color={T.labelTertiary} />}
                  <View style={{ flex: 1 }}>
                    <Text style={[ty.body, { color: free ? T.label : T.labelSecondary }]} numberOfLines={2}>{l.n}. {l.title}</Text>
                    <Text style={[ty.caption1, { color: free ? T.green : T.labelTertiary, marginTop: 1 }]} numberOfLines={1}>{free ? 'Смотреть бесплатно' : 'Откроется после покупки'}</Text>
                  </View>
                  {i < course.lessons.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 48, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
                </Pressable>
              );
            })}
          </ListSection>
        ) : null}
      </ScrollView>

      {/* Закреплённая панель: только бесплатный урок, если он есть.
          Кнопки покупки нет — см. комментарий к карточке выше. */}
      {freeLesson ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
          <PrimaryButton label={tr('Смотреть бесплатный урок')} icon="play.fill"
            onPress={() => navigation.navigate('Video', { courseId, lessonId: freeLesson.id })} />
        </View>
      ) : null}
    </View>
  );
}
