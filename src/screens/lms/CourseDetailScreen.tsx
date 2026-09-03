import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Share, Alert } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../../components/SFIcon';
import { NavHeader, NavRoundButton } from '../../components/NavHeader';
import { ProgressBar, Capsule, ListSection, PrimaryButton } from '../../components/ui';
import { shadows } from '../../theme/tokens';
import { ErrorState, EmptyState } from '../../components/StateViews';
import { lessonsWord } from '../../components/CourseCardPremium';
import { useCourses } from '../../state/CourseContext';
import { useMyCourses } from '../../state/useMyCourses';
import { useRole } from '../../state/useRole';
import { useAuth } from '@clerk/clerk-expo';
import { stripHtml, API_BASE, imgUrl, formatPrice, startCoursePayment } from '../../data/api';
import { Course } from '../../data/courses';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'CourseDetail'>;
type Nav = Props['navigation'];

// Floating translucent header over the course hero image (dark scrim buttons).
// «Загрузки» only make sense for an owned course (audio is downloadable from
// owned courses only). The old bookmark button wrote `bookmark:<id>` that no
// screen ever read — dead UI, removed.
function HeroNav({ course, courseId, navigation, owned }: { course: Course; courseId: string; navigation: Nav; owned?: boolean }) {
  return (
    <NavHeader
      variant="overlay"
      overlayScheme="dark"
      onBack={() => navigation.goBack()}
      trailing={
        <>
          {owned ? (
            <NavRoundButton icon="arrow.down.circle" scheme="dark" accessibilityLabel="Загрузки"
              onPress={() => navigation.navigate('Downloads')} />
          ) : null}
          <NavRoundButton icon="square.and.arrow.up" scheme="dark" accessibilityLabel="Поделиться"
            onPress={() => Share.share({ message: `${course.title} — Divergents\n${API_BASE}/courses/${courseId}` })} />
        </>
      }
    />
  );
}

export function CourseDetailScreen({ route, navigation }: Props) {
  const { T, ty } = useTheme();
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

  // После оплаты доступ уже выдан на сервере — перечитываем «Мои курсы» и
  // деталь, чтобы курс открылся сразу, без выхода с экрана.
  const onPurchased = useCallback(async () => {
    const token = isSignedIn ? await getToken() : null;
    await my.reload();
    await loadDetail(courseId, token);
  }, [courseId, isSignedIn, getToken, my.reload, loadDetail]);

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
    : <SalesCourse course={course} courseId={courseId} navigation={navigation} onPurchased={onPurchased} />;
}

// ─── Owned / free course → learning page ───────────────────────────
function OwnedCourse({ course, courseId, navigation }: { course: Course; courseId: string; navigation: Nav }) {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const { detailLoading, detailError, loadDetail, progress, currentLessonIndex, lessonStatus } = useCourses();
  const { isSignedIn, getToken } = useAuth();
  const retryDetail = async () => {
    const token = isSignedIn ? await getToken() : null;
    await loadDetail(courseId, token);
  };
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
          <HeroNav course={course} courseId={courseId} navigation={navigation} owned />
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 20 }}>
            {/* Opaque base under the emerald tint: the badge sits on a dark photo. */}
            <View style={{ alignSelf: 'flex-start', borderRadius: 999, backgroundColor: T.cardBg }}>
              <Capsule bg={T.emeraldBadgeBg} color={T.emeraldText}>
                <SF name="checkmark.seal.fill" size={11} color={T.emeraldText} />{tr('Курс открыт')}
              </Capsule>
            </View>
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
              <Text style={[ty.subhead, { color: T.greenText, marginTop: 6 }]} numberOfLines={1}>{tr('Курс пройден')}</Text>
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
        ) : detailError[courseId] && course.lessons.length === 0 ? (
          <ErrorState message={tr('Не удалось загрузить программу курса. Проверьте подключение.')} onRetry={retryDetail} />
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
function SalesCourse({ course, courseId, navigation, onPurchased }: {
  course: Course; courseId: string; navigation: Nav; onPurchased: () => Promise<void>;
}) {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const { detailLoading, detailError, loadDetail } = useCourses();
  const { getToken, isSignedIn } = useAuth();
  const { feature } = useRole();
  const [buying, setBuying] = useState(false);
  const freeLesson = course.lessons.find((l) => l.isFree);
  const chaptersLoading = detailLoading[courseId] && course.lessons.length === 0;
  const retryDetail = async () => {
    const token = isSignedIn ? await getToken() : null;
    await loadDetail(courseId, token);
  };
  const gifted = course.gifted === true;
  const price = course.price ?? 0;
  // Покупка внутри приложения включается флагом в админ-панели сайта и по
  // умолчанию выключена: Apple запрещает продавать цифровой контент мимо
  // встроенных покупок. Подарок бесплатен — цену и кнопку он вытесняет.
  const canBuy = feature('purchases') && !gifted && price > 0;

  const buy = async () => {
    if (buying) return;
    setBuying(true);
    try {
      const token = await getToken();
      const { status } = await startCoursePayment(courseId, token);
      if (status === 'success') await onPurchased();
      else if (status === 'fail') {
        Alert.alert(tr('Оплата не прошла'), tr('Платёж отклонён. Попробуйте ещё раз или другой картой.'));
      }
    } catch {
      Alert.alert(tr('Не удалось открыть оплату'), tr('Проверьте подключение и попробуйте снова.'));
    } finally {
      setBuying(false);
    }
  };

  // Only promise what the course actually has: the materials row appears when
  // the detail carries attachments.
  const includes = [
    { icon: 'play.circle.fill', t: lessonsWord(course.chaptersCount ?? course.lessons.length) },
    ...((course.attachments?.length ?? 0) > 0 ? [{ icon: 'doc.fill', t: tr('Материалы и конспекты') }] : []),
    { icon: 'person.3.fill', t: tr('Обсуждение с участниками') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: T.systemBg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + (canBuy && freeLesson ? 165 : canBuy || freeLesson ? 100 : 30) }}>
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

        {/* Курс без доступа. Пока покупка выключена (обычное состояние — правила
            App Store запрещают продавать цифровой контент мимо встроенных
            покупок), здесь нет ни цены, ни кнопки: курс открывается на сайте и
            просто становится доступным. С включённым флагом показываем цену и
            оплату TipTopPay.
            Подаренный по стартовой акции курс может ещё не подтянуться в «Мои
            курсы» — тогда говорим про подарок, а не про закрытый доступ. */}
        <View style={{ margin: 16, backgroundColor: T.cardBg, borderRadius: 18, padding: 18, ...shadows.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SF name={gifted ? 'gift.fill' : 'lock.fill'} size={15} color={gifted ? T.brand : T.labelSecondary} />
            <Text style={[ty.title3, { color: T.label, flexShrink: 1 }]} numberOfLines={2}>
              {gifted ? tr('Курс открыт для вас бесплатно') : canBuy ? tr('Полный доступ к курсу') : tr('Курс пока не открыт')}
            </Text>
          </View>
          {canBuy ? (
            <Text style={[ty.largeTitle, { color: T.brand, marginTop: 8 }]} numberOfLines={1}>{formatPrice(price)}</Text>
          ) : null}
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 6 }]}>
            {gifted
              ? tr('Это подарок участникам, которые пришли раньше всех. Курс появится в разделе «Мои курсы».')
              : canBuy
                ? tr('Разовая оплата — курс останется у вас навсегда и появится в разделе «Мои курсы».')
                : tr('Когда доступ будет открыт, курс появится в разделе «Мои курсы».')}
          </Text>
          {canBuy ? (
            <PrimaryButton label={`${tr('Купить курс')} · ${formatPrice(price)}`} icon="creditcard.fill"
              loading={buying} style={{ marginTop: 12 }} onPress={buy} />
          ) : null}
          {/* «Смотреть бесплатный урок» lives in the sticky bottom panel only —
              the same button twice on one screen was noise. */}
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
        ) : detailError[courseId] && course.lessons.length === 0 ? (
          <ErrorState message={tr('Не удалось загрузить программу курса. Проверьте подключение.')} onRetry={retryDetail} />
        ) : course.lessons.length > 0 ? (
          <ListSection header={`Программа · ${lessonsWord(course.lessons.length)}`}>
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
                    <Text style={[ty.caption1, { color: free ? T.greenText : T.labelTertiary, marginTop: 1 }]} numberOfLines={1}>{free ? 'Смотреть бесплатно' : 'Откроется вместе с курсом'}</Text>
                  </View>
                  {i < course.lessons.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 48, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
                </Pressable>
              );
            })}
          </ListSection>
        ) : null}
      </ScrollView>

      {/* Закреплённая панель: покупка (когда флаг включён) и бесплатный урок.
          С выключенным флагом кнопки покупки нет — см. комментарий выше. */}
      {canBuy || freeLesson ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
          {canBuy ? (
            <PrimaryButton label={`${tr('Купить курс')} · ${formatPrice(price)}`} icon="creditcard.fill"
              loading={buying} onPress={buy} />
          ) : null}
          {freeLesson ? (
            <PrimaryButton label={tr('Смотреть бесплатный урок')} icon="play.fill"
              color={canBuy ? 'transparent' : undefined} style={canBuy ? { marginTop: 8 } : undefined}
              onPress={() => navigation.navigate('Video', { courseId, lessonId: freeLesson.id })} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
