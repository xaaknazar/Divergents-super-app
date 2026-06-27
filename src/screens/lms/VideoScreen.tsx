import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, ScrollView, Linking, TextInput, ActivityIndicator, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAuth } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { NavHeader } from '../../components/NavHeader';
import { Segmented, PrimaryButton, ty } from '../../components/ui';
import { ErrorState } from '../../components/StateViews';
import { useCourses } from '../../state/CourseContext';
import { useMyCourses } from '../../state/useMyCourses';
import { useDownloads } from '../../state/DownloadsContext';
import { API_BASE, stripHtml, fetchComments, postComment, ChapterComment, lessonAudioUrl } from '../../data/api';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'Video'>;

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}
const initials = (c: ChapterComment) =>
  ((c.user.firstName?.[0] ?? '') + (c.user.lastName?.[0] ?? '')).toUpperCase() || 'У';
const fullName = (c: ChapterComment) =>
  [c.user.firstName, c.user.lastName].filter(Boolean).join(' ') || 'Участник';

export function VideoScreen({ route, navigation }: Props) {
  const { T } = useTheme();
  useLang();
  const insets = useSafeAreaInsets();
  const { courseId, lessonId } = route.params;
  const { getCourse, completeLesson, isCompleted, loadDetail } = useCourses();
  const { isSignedIn, getToken } = useAuth();
  const my = useMyCourses();
  const course = getCourse(courseId);
  const lesson = course?.lessons.find((l) => l.id === lessonId) ?? course?.lessons[0];
  const [tab, setTab] = useState(0);

  // Ownership: free, purchased (in "Мои курсы"), or a non-live (local) course.
  const isFreeCourse = (course?.price ?? 0) <= 0;
  const ownedByApi = my.courses.some((c) => c.id === courseId);
  const owned = isFreeCourse || ownedByApi || (course?.source !== 'live');

  const hls = lesson?.hlsUrl ?? null;
  // Distinguish "must buy" (not owned, paid, no free preview) from "video
  // temporarily unavailable" (owned but HLS missing) — never a silent black screen.
  const resolving = !!isSignedIn && !my.ready && !hls && lesson?.isFree === false;
  const needsPurchase = !owned && course?.source === 'live' && lesson?.isFree === false && !hls && !resolving;
  const unavailable = owned && !hls && !resolving;
  const player = useVideoPlayer(hls ?? '', (p) => { p.loop = false; });
  const videoRef = useRef<VideoView>(null);

  // Autoplay once a real HLS source is available (also covers the case where the
  // owned HLS arrives after a late detail fetch). Guarded so an empty source never throws.
  useEffect(() => {
    if (!hls) return;
    try { player.play(); } catch {}
  }, [hls, player]);

  // If the lesson's video URL isn't loaded yet (typically an owned/paid chapter
  // whose Mux HLS only comes from the authed detail endpoint), fetch the course
  // detail once with the user's token so the player can resolve a real source.
  useEffect(() => {
    if (!course || !lesson || lesson.hlsUrl || lesson.isFree || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!cancelled && token) loadDetail(courseId, token);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [courseId, lesson?.id, lesson?.hlsUrl, lesson?.isFree, isSignedIn]);

  // discussion state
  const [comments, setComments] = useState<ChapterComment[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);

  const loadComments = useCallback(async () => {
    if (!lesson) return;
    setLoadingComments(true);
    setCommentsError(false);
    try {
      setComments(await fetchComments(courseId, lesson.id));
    } catch {
      setCommentsError(true);
      setComments(null);
    } finally {
      setLoadingComments(false);
    }
  }, [courseId, lesson]);

  useEffect(() => {
    if (tab === 2 && comments === null && !commentsError) loadComments();
  }, [tab, comments, commentsError, loadComments]);

  if (!course || !lesson) {
    return (
      <View style={{ flex: 1, backgroundColor: T.systemBg }}>
        <NavHeader transparent hideBackLabel onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 80, gap: 10 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
            <SF name="play.slash" size={28} color={T.labelTertiary} />
          </View>
          <Text style={[ty.headline, { color: T.label, textAlign: 'center', marginTop: 4 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{tr('Урок недоступен')}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center' }]}>{tr('Этот урок не найден или ещё не загружен. Вернитесь к курсу и попробуйте снова.')}</Text>
          <PrimaryButton label={tr('Назад к курсу')} icon="chevron.left" onPress={() => navigation.goBack()} style={{ marginTop: 14, paddingHorizontal: 28, alignSelf: 'center' }} />
        </View>
      </View>
    );
  }
  const alreadyDone = isCompleted(courseId, lesson.id);
  const { isDownloaded, download, remove, downloading } = useDownloads();
  const audioUrl = lessonAudioUrl(lesson);
  const dlKey = `${courseId}:${lesson.id}`;
  const downloaded = isDownloaded(courseId, lesson.id);
  const dlBusy = downloading === dlKey;
  const onDownloadAudio = async () => {
    if (downloaded) { await remove(dlKey); return; }
    if (!audioUrl) { Alert.alert('Аудио недоступно', 'Для этого урока пока нет аудиоверсии.'); return; }
    const okDl = await download({ courseId, courseTitle: course.title, lessonId: lesson.id, title: lesson.title, audioUrl });
    if (!okDl) Alert.alert('Не удалось скачать', 'Проверьте подключение и попробуйте снова.');
  };
  const attachments = course.attachments ?? [];

  const complete = async () => {
    const token = isSignedIn ? await getToken() : null;
    completeLesson(courseId, lesson.id, token);
    navigation.goBack();
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || !isSignedIn || sending) return;
    setSending(true);
    setSendError(false);
    try {
      const token = await getToken();
      const created = token ? await postComment(courseId, lesson.id, text, token) : null;
      if (created) {
        setComments((prev) => [created, ...(prev ?? [])]);
        setDraft('');
      } else {
        setSendError(true);
      }
    } catch {
      setSendError(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Video area */}
      <View style={{ paddingTop: insets.top, height: 240 + insets.top, backgroundColor: '#0E1729' }}>
        <View style={{ position: 'absolute', top: insets.top + 12, left: 12, right: 12, zIndex: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={() => navigation.goBack()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}>
            <SF name="chevron.down" size={18} color="#fff" />
          </Pressable>
          <View style={{ alignItems: 'center', flex: 1, paddingHorizontal: 8 }}>
            <Text style={[ty.subheadEm, { color: '#fff' }]} numberOfLines={1}>{tr('Урок')} {lesson.n}</Text>
            <Text style={[ty.caption2, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>{lesson.title}</Text>
          </View>
          {hls ? (
            <Pressable onPress={() => { try { videoRef.current?.enterFullscreen(); } catch {} }} hitSlop={8}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}>
              <SF name="arrow.up.left.and.arrow.down.right" size={16} color="#fff" />
            </Pressable>
          ) : <View style={{ width: 32 }} />}
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {hls ? (
            <VideoView ref={videoRef} player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls allowsFullscreen />
          ) : resolving ? (
            <ActivityIndicator color="#fff" />
          ) : needsPurchase ? (
            <View style={{ alignItems: 'center', paddingHorizontal: 30 }}>
              <SF name="lock.fill" size={40} color="rgba(255,255,255,0.85)" />
              <Text style={[ty.headline, { color: '#fff', marginTop: 12, textAlign: 'center' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{tr('Урок по подписке')}</Text>
              <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center' }]}>{tr('Купите курс на сайте, чтобы открыть все уроки')}</Text>
            </View>
          ) : unavailable ? (
            <View style={{ alignItems: 'center', paddingHorizontal: 30 }}>
              <SF name="exclamationmark.triangle.fill" size={36} color="rgba(255,255,255,0.85)" />
              <Text style={[ty.headline, { color: '#fff', marginTop: 12, textAlign: 'center' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{tr('Видео недоступно')}</Text>
              <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center' }]}>{tr('Видео этого урока сейчас не загружается. Проверьте подключение или попробуйте позже.')}</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <SF name="play.circle.fill" size={64} color="rgba(255,255,255,0.85)" />
              <Text style={[ty.caption1, { color: 'rgba(255,255,255,0.6)', marginTop: 10 }]} numberOfLines={1}>{tr('Демо-урок без видео')}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Sheet */}
      <View style={{ flex: 1, backgroundColor: T.systemBg, borderTopLeftRadius: 14, borderTopRightRadius: 14, marginTop: -2 }}>
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: T.fillSecondary }} />
        </View>
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <Text style={[ty.title3, { color: T.label }]} numberOfLines={2}>{lesson.title}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1}>{tr('Урок')} {lesson.n} {tr('из')} {course.lessons.length} · {course.title}</Text>
          {owned && audioUrl ? (
            <Pressable onPress={onDownloadAudio} disabled={dlBusy} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: downloaded ? T.brandTinted : T.fillSecondary, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 14 }}>
              {dlBusy ? <ActivityIndicator color={T.brand} /> : <SF name={downloaded ? 'checkmark.circle.fill' : 'arrow.down.circle'} size={16} color={T.brand} />}
              <Text style={[ty.footnoteEm, { color: T.brand }]}>{dlBusy ? 'Скачивание…' : downloaded ? 'Аудио скачано · удалить' : 'Скачать аудио (офлайн)'}</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Segmented items={['Заметки', 'Материалы', 'Обсуждение']} value={tab} onChange={setTab} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 90 }} keyboardShouldPersistTaps="handled">
          {/* НОТES */}
          {tab === 0 ? (
            stripHtml(lesson.description) ? (
              <View style={{ paddingHorizontal: 20 }}>
                <Text style={[ty.body, { color: T.label }]}>{stripHtml(lesson.description)}</Text>
              </View>
            ) : (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <SF name="doc.text" size={32} color={T.labelTertiary} />
                <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 10 }]}>{tr('Заметок к уроку пока нет')}</Text>
              </View>
            )
          ) : null}

          {/* МАТЕРИАЛЫ */}
          {tab === 1 ? (
            attachments.length > 0 ? (
              <View style={{ paddingHorizontal: 16 }}>
                {attachments.map((a, i) => (
                  <Pressable key={a.id} onPress={() => Linking.openURL(a.url)}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: i < attachments.length - 1 ? 0.5 : 0, borderBottomColor: T.separator, opacity: pressed ? 0.6 : 1 })}>
                    <View style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
                      <SF name="doc.fill" size={18} color={T.brand} />
                    </View>
                    <Text style={[ty.body, { flex: 1, color: T.label }]} numberOfLines={1}>{a.name}</Text>
                    <SF name="arrow.up.circle.fill" size={20} color={T.brand} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <SF name="doc.text" size={32} color={T.labelTertiary} />
                <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 10 }]}>{tr('Материалов к этому уроку нет')}</Text>
              </View>
            )
          ) : null}

          {/* ОБСУЖДЕНИЕ */}
          {tab === 2 ? (
            <View style={{ paddingHorizontal: 16 }}>
              {loadingComments ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}><ActivityIndicator color={T.brand} /></View>
              ) : commentsError ? (
                <ErrorState message={tr('Не удалось загрузить обсуждение. Проверьте подключение.')} onRetry={loadComments} />
              ) : comments && comments.length > 0 ? (
                comments.map((c) => (
                  <View key={c.id} style={{ flexDirection: 'row', gap: 10, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={[ty.caption2Em, { color: '#fff' }]}>{initials(c)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[ty.subheadEm, { color: T.label, flexShrink: 1 }]} numberOfLines={1}>{fullName(c)}</Text>
                        <Text style={[ty.caption2, { color: T.labelTertiary }]}>{fmtDate(c.createdAt)}</Text>
                        {c.isPinned ? <SF name="bookmark.fill" size={11} color={T.orange} /> : null}
                      </View>
                      <Text style={[ty.body, { color: T.label, marginTop: 2 }]}>{c.content}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <SF name="person.3.fill" size={32} color={T.labelTertiary} />
                  <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 10 }]}>{tr('Обсуждения пока нет. Будьте первым!')}</Text>
                </View>
              )}

              {/* composer */}
              {isSignedIn ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                    <TextInput
                      value={draft}
                      onChangeText={(v) => { setDraft(v); if (sendError) setSendError(false); }}
                      placeholder={tr('Написать комментарий…')}
                      placeholderTextColor={T.labelTertiary}
                      style={[ty.body, { flex: 1, backgroundColor: T.fillTertiary, borderRadius: 18, paddingVertical: 9, paddingHorizontal: 14, color: T.label }]}
                      onSubmitEditing={send}
                      returnKeyType="send"
                      editable={!sending}
                    />
                    <Pressable onPress={send} disabled={sending || !draft.trim()} hitSlop={6}>
                      {sending ? <ActivityIndicator color={T.brand} /> : <SF name="arrow.up.circle.fill" size={32} color={draft.trim() ? T.brand : T.labelTertiary} />}
                    </Pressable>
                  </View>
                  {sendError ? (
                    <Text style={[ty.caption1, { color: T.red, marginTop: 6 }]}>{tr('Не удалось отправить. Попробуйте ещё раз.')}</Text>
                  ) : null}
                </>
              ) : (
                <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={[ty.caption1, { color: T.labelTertiary, textAlign: 'center' }]}>{tr('Войдите, чтобы участвовать в обсуждении')}</Text>
                </View>
              )}
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* Bottom CTA */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
        {needsPurchase ? (
          <PrimaryButton label={tr('Открыть на сайте')} icon="globe" onPress={() => Linking.openURL(`${API_BASE}/courses/${courseId}`)} />
        ) : (
          <PrimaryButton
            label={alreadyDone ? 'Урок завершён ✓' : 'Завершить урок'}
            icon={alreadyDone ? 'checkmark' : undefined}
            color={alreadyDone ? T.green : T.brand}
            onPress={complete}
          />
        )}
      </View>
    </View>
  );
}
