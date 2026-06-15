import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, Linking, TextInput, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAuth } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { Segmented, PrimaryButton, ty } from '../../components/ui';
import { useCourses } from '../../state/CourseContext';
import { API_BASE, stripHtml, fetchComments, postComment, ChapterComment } from '../../data/api';
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
  const insets = useSafeAreaInsets();
  const { courseId, lessonId } = route.params;
  const { getCourse, completeLesson, isCompleted } = useCourses();
  const { isSignedIn, getToken } = useAuth();
  const course = getCourse(courseId);
  const lesson = course?.lessons.find((l) => l.id === lessonId) ?? course?.lessons[0];
  const [tab, setTab] = useState(0);

  const hls = lesson?.hlsUrl ?? null;
  const locked = course?.source === 'live' && lesson?.isFree === false && !lesson?.hlsUrl;
  const player = useVideoPlayer(hls ?? '', (p) => { p.loop = false; });

  // discussion state
  const [comments, setComments] = useState<ChapterComment[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const loadComments = useCallback(async () => {
    if (!lesson) return;
    setLoadingComments(true);
    setComments(await fetchComments(courseId, lesson.id));
    setLoadingComments(false);
  }, [courseId, lesson]);

  useEffect(() => {
    if (tab === 2 && comments === null) loadComments();
  }, [tab, comments, loadComments]);

  if (!course || !lesson) {
    return <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }} />;
  }
  const alreadyDone = isCompleted(courseId, lesson.id);
  const attachments = course.attachments ?? [];

  const send = async () => {
    const text = draft.trim();
    if (!text || !isSignedIn) return;
    setSending(true);
    const token = await getToken();
    if (token) {
      const created = await postComment(courseId, lesson.id, text, token);
      if (created) { setComments((prev) => [created, ...(prev ?? [])]); setDraft(''); }
    }
    setSending(false);
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
            <Text style={[ty.subheadEm, { color: '#fff' }]}>Урок {lesson.n}</Text>
            <Text style={[ty.caption2, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>{lesson.title}</Text>
          </View>
          <View style={{ width: 32 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {hls ? (
            <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls allowsFullscreen />
          ) : locked ? (
            <View style={{ alignItems: 'center', paddingHorizontal: 30 }}>
              <SF name="lock.fill" size={40} color="rgba(255,255,255,0.85)" />
              <Text style={[ty.headline, { color: '#fff', marginTop: 12, textAlign: 'center' }]}>Урок по подписке</Text>
              <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center' }]}>Купите курс на сайте, чтобы открыть все уроки</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <SF name="play.circle.fill" size={64} color="rgba(255,255,255,0.85)" />
              <Text style={[ty.caption1, { color: 'rgba(255,255,255,0.6)', marginTop: 10 }]}>Демо-урок без видео</Text>
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
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]}>Урок {lesson.n} из {course.lessons.length} · {course.title}</Text>
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
                <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 10 }]}>Заметок к уроку пока нет</Text>
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
                <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 10 }]}>Материалов к этому уроку нет</Text>
              </View>
            )
          ) : null}

          {/* ОБСУЖДЕНИЕ */}
          {tab === 2 ? (
            <View style={{ paddingHorizontal: 16 }}>
              {loadingComments ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}><ActivityIndicator color={T.brand} /></View>
              ) : comments && comments.length > 0 ? (
                comments.map((c) => (
                  <View key={c.id} style={{ flexDirection: 'row', gap: 10, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={[ty.caption2Em, { color: '#fff' }]}>{initials(c)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[ty.subheadEm, { color: T.label }]}>{fullName(c)}</Text>
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
                  <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 10 }]}>Обсуждения пока нет. Будьте первым!</Text>
                </View>
              )}

              {/* composer */}
              {isSignedIn ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Написать комментарий…"
                    placeholderTextColor={T.labelTertiary}
                    style={[ty.body, { flex: 1, backgroundColor: T.fillTertiary, borderRadius: 18, paddingVertical: 9, paddingHorizontal: 14, color: T.label }]}
                    onSubmitEditing={send}
                    returnKeyType="send"
                  />
                  <Pressable onPress={send} disabled={sending || !draft.trim()} hitSlop={6}>
                    {sending ? <ActivityIndicator color={T.brand} /> : <SF name="arrow.up.circle.fill" size={32} color={draft.trim() ? T.brand : T.labelTertiary} />}
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => navigation.getParent()?.getParent()?.navigate('Auth' as never)}
                  style={{ marginTop: 12, padding: 12, backgroundColor: T.brandTinted, borderRadius: 12, alignItems: 'center' }}>
                  <Text style={[ty.subheadEm, { color: T.brand }]}>Войдите, чтобы комментировать</Text>
                </Pressable>
              )}
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* Bottom CTA */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: 'rgba(249,249,249,0.96)', borderTopWidth: 0.5, borderTopColor: T.separator }}>
        {locked ? (
          <PrimaryButton label="Открыть на сайте" icon="globe" onPress={() => Linking.openURL(`${API_BASE}/courses/${courseId}`)} />
        ) : (
          <PrimaryButton
            label={alreadyDone ? 'Урок завершён ✓' : 'Завершить урок'}
            icon={alreadyDone ? 'checkmark' : undefined}
            color={alreadyDone ? T.green : T.brand}
            onPress={() => { completeLesson(courseId, lesson.id); navigation.goBack(); }}
          />
        )}
      </View>
    </View>
  );
}
