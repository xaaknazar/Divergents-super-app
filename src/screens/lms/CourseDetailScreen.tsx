import React, { useEffect } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Share, Linking } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../../components/SFIcon';
import { ProgressBar, Capsule, ListSection, PrimaryButton, ty } from '../../components/ui';
import { ErrorState, EmptyState } from '../../components/StateViews';
import { useEnrollment } from '../../state/EnrollmentContext';
import { useCourses } from '../../state/CourseContext';
import { useMyCourses } from '../../state/useMyCourses';
import { useAuth } from '@clerk/clerk-expo';
import { formatPrice, stripHtml, API_BASE, imgUrl } from '../../data/api';
import { Course } from '../../data/courses';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'CourseDetail'>;
type Nav = Props['navigation'];

function RoundBtn({ icon, onPress }: { icon: string; onPress?: () => void }) {
  const { T } = useTheme();
  useLang();
  return (
    <Pressable onPress={onPress} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
      <SF name={icon} size={16} color="#fff" />
    </Pressable>
  );
}

function HeroBar({ course, courseId, navigation }: { course: Course; courseId: string; navigation: Nav }) {
  const { has, toggle } = useEnrollment();
  const insets = useSafeAreaInsets();
  const bookmarked = has(`bookmark:${courseId}`);
  return (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <RoundBtn icon="chevron.left" onPress={() => navigation.goBack()} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <RoundBtn icon="square.and.arrow.up" onPress={() => Share.share({ message: `${course.title} — Divergents\n${API_BASE}/courses/${courseId}` })} />
        <RoundBtn icon={bookmarked ? 'bookmark.fill' : 'bookmark'} onPress={() => toggle(`bookmark:${courseId}`)} />
      </View>
    </View>
  );
}

export function CourseDetailScreen({ route, navigation }: Props) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { courseId } = route.params;
  const { getCourse, loadDetail, loading, error, reload } = useCourses();
  const course = getCourse(courseId);
  const { isSignedIn, getToken } = useAuth();
  const my = useMyCourses();

  useEffect(() => {
    (async () => {
      const token = isSignedIn ? await getToken() : null;
      if (course && (course.lessons.length === 0 || token)) loadDetail(courseId, token);
    })();
  }, [courseId, isSignedIn]);

  if (!course) {
    return (
      <View style={{ flex: 1, backgroundColor: T.systemBg, paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ padding: 12 }}>
          <SF name="chevron.left" size={22} color={T.brandAccent} />
        </Pressable>
        {loading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={T.brand} /></View>
        ) : (
          <ErrorState message={error ? 'Не удалось загрузить курс. Проверьте подключение.' : 'Курс не найден.'} onRetry={reload} />
        )}
      </View>
    );
  }

  const isFree = (course.price ?? 0) <= 0;
  const ownedByApi = my.courses.some((c) => c.id === courseId);
  // Free, owned, or local demo courses → learning view. Paid live courses you
  // don't own → sales/landing view.
  const owned = isFree || ownedByApi || course.source !== 'live';

  // Avoid the "not purchased" flash: wait until owned courses are resolved.
  if (!isFree && course.source === 'live' && my.isSignedIn && !my.ready) {
    return (
      <View style={{ flex: 1, backgroundColor: T.systemBg, paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ padding: 12 }}>
          <SF name="chevron.left" size={22} color={T.brandAccent} />
        </Pressable>
        <View style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={T.brand} /></View>
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
  const curLesson = course.lessons[curIdx];
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
          <View style={{ position: 'absolute', width: '100%', height: 230, backgroundColor: 'rgba(0,0,0,0.28)' }} />
          <HeroBar course={course} courseId={courseId} navigation={navigation} />
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 20 }}>
            <Capsule bg="rgba(52,199,89,0.9)" color="#fff"><SF name="checkmark.seal.fill" size={11} color="#fff" />{tr('Курс открыт')}</Capsule>
            <Text style={[ty.title1, { color: '#fff', marginTop: 10 }]}>{course.title}</Text>
            <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 2 }]}>{course.author} · Divergents</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
          {meta.map((m, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < meta.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
              <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{m.v}</Text>
              <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 1 }]}>{m.l}</Text>
            </View>
          ))}
        </View>

        {course.lessons.length > 0 ? (
          <View style={{ margin: 16, backgroundColor: T.groupedBg, borderRadius: 14, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={[ty.body, { color: T.label }]}>{tr('Ваш прогресс')}</Text>
              <Text style={[ty.headline, { color: T.brand }]}>{Math.round(p * 100)}%</Text>
            </View>
            <View style={{ marginTop: 10 }}><ProgressBar value={p} /></View>
            {curLesson ? <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 6 }]} numberOfLines={1}>{tr('Урок')} {curLesson.n} — {curLesson.title}</Text> : null}
            <PrimaryButton label={p > 0 ? tr('Продолжить') : tr('Начать курс')} icon="play.fill" style={{ marginTop: 14 }}
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
                    <Text style={[ty.footnoteEm, { color: status === 'current' ? '#fff' : T.labelSecondary }]}>{l.n}</Text>
                  </View>
                );
              return (
                <Pressable key={l.id} onPress={() => navigation.navigate('Video', { courseId, lessonId: l.id })}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: status === 'current' ? T.brandTinted : 'transparent', opacity: pressed ? 0.6 : 1 })}>
                  {indicator}
                  <View style={{ flex: 1 }}>
                    <Text style={[ty.body, { color: T.label }]} numberOfLines={2}>{l.title}</Text>
                    <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{status === 'done' ? 'Пройдено' : l.duration}</Text>
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
  const buy = () => Linking.openURL(`${API_BASE}/courses/${courseId}`);
  const freeLesson = course.lessons.find((l) => l.isFree);
  const chaptersLoading = detailLoading[courseId] && course.lessons.length === 0;

  const includes = [
    { icon: 'play.circle.fill', t: `${course.chaptersCount ?? course.lessons.length} видеоуроков` },
    { icon: 'doc.fill', t: tr('Материалы и конспекты') },
    { icon: 'person.3.fill', t: tr('Обсуждение с участниками') },
    { icon: 'checkmark.seal.fill', t: tr('Доступ на 1 год') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: T.systemBg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Cover */}
        <View style={{ height: 300 }}>
          {course.imageUrl
            ? <Image source={imgUrl(course.imageUrl, 1080)} style={{ position: 'absolute', width: '100%', height: 300 }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
            : <View style={{ position: 'absolute', width: '100%', height: 300, backgroundColor: course.tint }} />}
          <View style={{ position: 'absolute', width: '100%', height: 300, backgroundColor: 'rgba(0,0,0,0.35)' }} />
          <HeroBar course={course} courseId={courseId} navigation={navigation} />
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 22 }}>
            <Capsule bg="rgba(255,255,255,0.9)" color={T.brand}>{course.category}</Capsule>
            <Text style={[ty.largeTitle, { color: '#fff', marginTop: 10 }]}>{course.title}</Text>
            <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.92)', marginTop: 2 }]}>{course.author} · Divergents</Text>
          </View>
        </View>

        {/* Price card */}
        <View style={{ margin: 16, backgroundColor: T.groupedBg, borderRadius: 16, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={[ty.largeTitle, { color: T.label }]}>{formatPrice(course.price)}</Text>
            <Text style={[ty.subhead, { color: T.labelSecondary }]}>{tr('единоразово')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <SF name="lock.fill" size={12} color={T.labelSecondary} />
            <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('Полный доступ открывается после покупки')}</Text>
          </View>
          <PrimaryButton label={`Купить · ${formatPrice(course.price)}`} icon="cart.fill" style={{ marginTop: 14 }} onPress={buy} />
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
              <Text style={[ty.body, { color: T.label, flex: 1 }]}>{it.t}</Text>
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
                    <Text style={[ty.caption1, { color: free ? T.green : T.labelTertiary, marginTop: 1 }]}>{free ? 'Смотреть бесплатно' : 'Откроется после покупки'}</Text>
                  </View>
                  {i < course.lessons.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 48, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
                </Pressable>
              );
            })}
          </ListSection>
        ) : null}
      </ScrollView>

      {/* Sticky buy bar */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View>
          <Text style={[ty.title3, { color: T.label }]}>{formatPrice(course.price)}</Text>
          <Text style={[ty.caption2, { color: T.labelSecondary }]}>{tr('оплата на divergents-lms.kz')}</Text>
        </View>
        <PrimaryButton label={tr('Купить курс')} icon="cart.fill" style={{ flex: 1 }} onPress={buy} />
      </View>
    </View>
  );
}
