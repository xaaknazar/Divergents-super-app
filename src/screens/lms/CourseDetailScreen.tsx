import React, { useCallback, useEffect } from 'react';
import { Share } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { useLang, tr } from '../../state/LanguageContext';
import { useCourses } from '../../state/CourseContext';
import { useMyCourses } from '../../state/useMyCourses';
import { useCoursePurchases } from '../../state/CoursePurchasesContext';
import { stripHtml, API_BASE } from '../../data/api';
import { LMSStackParams } from '../../navigation/types';
import { DetailScreen } from '../../components/DetailScreen';
import { HeaderIcon } from '../../components/HeaderIcon';
import { Wrapper } from '../../components/Wrapper';
import { BottomBar } from '../../components/BottomBar';
import { Button } from '../../components/Button';
import { ListSection } from '../../components/ListSection';
import { TextSection } from '../../components/TextSection';
import { CourseOverview } from '../../components/CourseOverview';
import { CourseProgressCard } from '../../components/CourseProgressCard';
import { CourseAccessCard } from '../../components/CourseAccessCard';
import { CourseIncludes } from '../../components/CourseIncludes';
import { LessonRow } from '../../components/LessonRow';
import { ContentLoading } from '../../components/ContentLoading';
import { EmptyState, ErrorState } from '../../components/StateViews';
import { CoursePurchasePanel } from '../../components/CoursePurchasePanel';
import { lessonsWord } from '../../components/CourseCardPremium';

type Props = NativeStackScreenProps<LMSStackParams, 'CourseDetail'>;

export function CourseDetailScreen({ route, navigation }: Props) {
  useLang();
  const courseId = route.params?.courseId ?? '';
  const { getCourse, loadDetail, loading, error, reload, detailLoading, detailError, progress, currentLessonIndex, lessonStatus } = useCourses();
  const course = getCourse(courseId);
  const { isSignedIn, getToken } = useAuth();
  const my = useMyCourses();
  const store = useCoursePurchases();
  const mapping = store.catalog.products.find(p => p.courseId === courseId);
  const product = mapping ? store.products.find(p => p.id === mapping.productId) : undefined;

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

  const goBack = () => navigation.goBack();
  if (!course) return <DetailScreen onBack={goBack}>
    {loading ? <ContentLoading /> : <ErrorState message={error ? 'Не удалось загрузить курс. Проверьте подключение.' : 'Курс не найден.'} onRetry={reload} />}
  </DetailScreen>;

  const isFree = (course.price ?? 0) <= 0;
  const ownedByApi = my.courses.some(c => c.id === courseId) || course.owned === true;
  const owned = isFree || ownedByApi || course.source !== 'live';
  // Preserve unknown-access guards: never ask a paying member to buy again.
  if (!isFree && course.source === 'live' && my.isSignedIn && !my.ready) return <DetailScreen onBack={goBack}><ContentLoading /></DetailScreen>;
  if (!owned && !isFree && course.source === 'live' && my.isSignedIn && my.error) return <DetailScreen onBack={goBack}>
    <ErrorState message={tr('Не удалось проверить доступ к курсу. Проверьте подключение и попробуйте снова.')} onRetry={() => my.reload()} />
  </DetailScreen>;

  const p = progress(courseId);
  const currentIndex = currentLessonIndex(courseId);
  const allDone = course.lessons.length > 0 && currentIndex === -1;
  const currentLesson = allDone ? course.lessons[0] : course.lessons[currentIndex];
  const chaptersLoading = detailLoading[courseId] && course.lessons.length === 0;
  const retryDetail = async () => { const token = isSignedIn ? await getToken() : null; await loadDetail(courseId, token); };
  const gifted = course.gifted === true;
  const price = course.price ?? 0;
  const canBuy = !owned && store.catalog.enabled && !!product && !gifted && price > 0;
  const freeLesson = course.lessons.find(lesson => lesson.isFree);
  const openLesson = (lessonId: string) => navigation.navigate('Video', { courseId, lessonId });

  const buy = async () => {
    if (await store.buy(courseId)) await onPurchased();
  };


  return <DetailScreen onBack={goBack} backLabel="Обучение" actions={<>
    {owned ? <HeaderIcon name="arrow.down.circle" label="Загрузки" onPress={() => navigation.navigate('Downloads')} /> : null}
    <HeaderIcon name="square.and.arrow.up" label="Поделиться" onPress={() => { Share.share({ message: course.title + ' — Divergents\n' + API_BASE + '/courses/' + courseId }); }} />
  </>} footer={!owned && (canBuy || freeLesson || (store.available && store.catalog.accountToken)) ? <BottomBar>
    {store.available && store.catalog.accountToken ? <CoursePurchasePanel priceLabel={canBuy ? product?.displayPrice : undefined}
      phase={store.phase} message={store.message} canRestore onBuy={buy}
      onRestore={async () => { await store.restore(); await onPurchased(); }} /> : null}
    {freeLesson ? <Button label={tr('Смотреть бесплатный урок')} icon="play.fill" onPress={() => openLesson(freeLesson.id)} variant={canBuy ? 'plain' : 'solid'} /> : null}
  </BottomBar> : undefined}>
    <Wrapper padding={16} gap={20}>
      <CourseOverview course={course} accessible={owned} />
      {owned ? course.lessons.length > 0 ? <CourseProgressCard progress={p} completed={allDone} lesson={currentLesson}
        onStart={currentLesson ? () => openLesson(currentLesson.id) : undefined} /> : null
        : <CourseAccessCard gifted={gifted} canBuy={canBuy} price={price} priceLabel={product?.displayPrice} />}
      {!owned && stripHtml(course.description) ? <TextSection title={tr('О курсе')} text={stripHtml(course.description)} /> : null}
      {!owned ? <CourseIncludes lessonCount={course.chaptersCount ?? course.lessons.length} hasMaterials={(course.attachments?.length ?? 0) > 0} /> : null}
      {chaptersLoading ? <ContentLoading /> : detailError[courseId] && course.lessons.length === 0 ?
        <ErrorState message={tr('Не удалось загрузить программу курса. Проверьте подключение.')} onRetry={retryDetail} /> :
        owned || course.lessons.length ? <ListSection header={owned ? tr('Программа курса') : 'Программа · ' + lessonsWord(course.lessons.length)}>
          {course.lessons.map((lesson, index) => <LessonRow key={lesson.id} lesson={lesson}
            state={owned ? lessonStatus(courseId, index) : lesson.isFree === true ? 'free' : 'locked'}
            onPress={owned || lesson.isFree === true ? () => openLesson(lesson.id) : undefined} />)}
          {course.lessons.length === 0 ? <EmptyState icon="book" title={tr('Программа готовится')} subtitle={tr('Уроки этого курса скоро появятся здесь.')} /> : null}
        </ListSection> : null}
      {owned && stripHtml(course.description) ? <TextSection title={tr('О курсе')} text={stripHtml(course.description)} /> : null}
    </Wrapper>
  </DetailScreen>;
}
