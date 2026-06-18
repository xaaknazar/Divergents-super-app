import React, { useEffect } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Share } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../../components/SFIcon';
import { ProgressBar, Capsule, ListSection, PrimaryButton, ty } from '../../components/ui';
import { ErrorState, EmptyState } from '../../components/StateViews';
import { useEnrollment } from '../../state/EnrollmentContext';
import { useCourses } from '../../state/CourseContext';
import { useAuth } from '@clerk/clerk-expo';
import { formatPrice, stripHtml, API_BASE, imgUrl } from '../../data/api';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'CourseDetail'>;

function RoundBtn({ icon, onPress }: { icon: string; onPress?: () => void }) {
  const { T } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' }}>
      <SF name={icon} size={16} color={T.label} />
    </Pressable>
  );
}

export function CourseDetailScreen({ route, navigation }: Props) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { courseId } = route.params;
  const { getCourse, loadDetail, detailLoading, loading, error, reload, progress, currentLessonIndex, lessonStatus } = useCourses();
  const course = getCourse(courseId);
  const { isSignedIn, getToken } = useAuth();
  const { has, toggle } = useEnrollment();
  const bookmarked = has(`bookmark:${courseId}`);

  useEffect(() => {
    (async () => {
      const token = isSignedIn ? await getToken() : null;
      // Load when we have no chapters yet, or (re)load with a token to unlock
      // owned-course videos after sign-in.
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
          <ErrorState
            message={error ? 'Не удалось загрузить курс. Проверьте подключение.' : 'Курс не найден.'}
            onRetry={reload}
          />
        )}
      </View>
    );
  }

  const p = progress(courseId);
  const curIdx = currentLessonIndex(courseId);
  const curLesson = course.lessons[curIdx];
  const isLive = course.source === 'live';
  const chaptersLoading = detailLoading[courseId] && course.lessons.length === 0;

  const meta = [
    { v: String(course.chaptersCount ?? course.lessons.length), l: 'Уроков' },
    { v: formatPrice(course.price), l: 'Цена' },
    { v: course.category, l: 'Тема' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: T.systemBg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        {/* Hero */}
        <View style={{ height: 280 }}>
          {course.imageUrl ? (
            <Image source={imgUrl(course.imageUrl, 1080)} style={{ position: 'absolute', width: '100%', height: 280 }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
          ) : (
            <View style={{ position: 'absolute', width: '100%', height: 280, backgroundColor: course.tint }} />
          )}
          <View style={{ position: 'absolute', width: '100%', height: 280, backgroundColor: 'rgba(0,0,0,0.18)' }} />
          <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <RoundBtn icon="chevron.left" onPress={() => navigation.goBack()} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <RoundBtn icon="square.and.arrow.up" onPress={() => Share.share({ message: `${course.title} — Divergents\n${API_BASE}/courses/${courseId}` })} />
              <RoundBtn icon={bookmarked ? 'bookmark.fill' : 'bookmark'} onPress={() => toggle(`bookmark:${courseId}`)} />
            </View>
          </View>
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 24 }}>
            <Capsule bg="rgba(255,255,255,0.85)" color={T.brand}>{course.category}</Capsule>
            <Text style={[ty.largeTitle, { color: '#fff', marginTop: 10 }]}>{course.title}</Text>
            <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 2 }]}>{course.author} · Divergents</Text>
          </View>
        </View>

        {/* Meta bar */}
        <View style={{ flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
          {meta.map((m, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < meta.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
              <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{m.v}</Text>
              <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 1 }]}>{m.l}</Text>
            </View>
          ))}
        </View>

        {/* Progress card */}
        {course.lessons.length > 0 ? (
          <View style={{ margin: 16, backgroundColor: T.groupedBg, borderRadius: 14, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={[ty.body, { color: T.label }]}>Ваш прогресс</Text>
              <Text style={[ty.headline, { color: T.brand }]}>{Math.round(p * 100)}%</Text>
            </View>
            <View style={{ marginTop: 10 }}><ProgressBar value={p} /></View>
            {curLesson ? <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 6 }]} numberOfLines={1}>Урок {curLesson.n} — {curLesson.title}</Text> : null}
            <PrimaryButton
              label={p > 0 ? 'Продолжить' : 'Начать курс'}
              icon="play.fill"
              style={{ marginTop: 14 }}
              onPress={() => curLesson && navigation.navigate('Video', { courseId, lessonId: curLesson.id })}
            />
          </View>
        ) : null}

        {/* Program */}
        {chaptersLoading ? (
          <View style={{ paddingVertical: 30, alignItems: 'center' }}><ActivityIndicator color={T.brand} /></View>
        ) : (
          <ListSection header="Программа курса">
            {course.lessons.map((l, i) => {
              const status = lessonStatus(courseId, i);
              const paid = isLive && l.isFree === false;
              const indicator = status === 'done'
                ? <SF name="checkmark.circle.fill" size={26} color={T.green} />
                : paid
                  ? <SF name="lock.fill" size={20} color={T.labelTertiary} />
                  : (
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: status === 'current' ? T.brand : T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={[ty.footnoteEm, { color: status === 'current' ? '#fff' : T.labelSecondary }]}>{l.n}</Text>
                    </View>
                  );
              return (
                <Pressable key={l.id}
                  onPress={() => navigation.navigate('Video', { courseId, lessonId: l.id })}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: status === 'current' ? T.brandTinted : 'transparent', opacity: pressed ? 0.6 : 1 })}>
                  {indicator}
                  <View style={{ flex: 1 }}>
                    <Text style={[ty.body, { color: T.label }]} numberOfLines={2}>{l.title}</Text>
                    <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>
                      {l.isFree ? 'Бесплатный урок' : paid ? 'Платный · купить на сайте' : l.duration}
                    </Text>
                  </View>
                  <SF name="chevron.forward" size={14} color={T.labelTertiary} />
                  {i < course.lessons.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 54, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
                </Pressable>
              );
            })}
            {course.lessons.length === 0 ? (
              <EmptyState icon="book" title="Программа готовится" subtitle="Уроки этого курса скоро появятся здесь." />
            ) : null}
          </ListSection>
        )}

        {stripHtml(course.description) ? (
          <ListSection header="О курсе">
            <View style={{ padding: 16 }}>
              <Text style={[ty.body, { color: T.label }]}>{stripHtml(course.description)}</Text>
            </View>
          </ListSection>
        ) : null}
      </ScrollView>
    </View>
  );
}
