import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SF } from '../../components/SFIcon';
import { Segmented, PrimaryButton, T, ty } from '../../components/ui';
import { useCourses } from '../../state/CourseContext';
import { API_BASE } from '../../data/api';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'Video'>;

const NOTES = [
  { t: '04:18', n: 'Ключевая мысль урока — зафиксируйте её для себя.' },
  { t: '11:42', n: 'Свяжите это со своими талантами Gallup.' },
];

export function VideoScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { courseId, lessonId } = route.params;
  const { getCourse, completeLesson, isCompleted } = useCourses();
  const course = getCourse(courseId);
  const lesson = course?.lessons.find((l) => l.id === lessonId) ?? course?.lessons[0];
  const [tab, setTab] = useState(0);

  const hls = lesson?.hlsUrl ?? null;
  // 'locked' only when it's paid AND we have no playable stream (i.e. not owned)
  const locked = course?.source === 'live' && lesson?.isFree === false && !lesson?.hlsUrl;

  // expo-video player (created unconditionally to satisfy hook rules)
  const player = useVideoPlayer(hls ?? '', (p) => { p.loop = false; });

  if (!course || !lesson) {
    return <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }} />;
  }

  const alreadyDone = isCompleted(courseId, lesson.id);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Video / placeholder area */}
      <View style={{ paddingTop: insets.top, height: 240 + insets.top, backgroundColor: '#0E1729' }}>
        {/* Top controls */}
        <View style={{ position: 'absolute', top: insets.top + 12, left: 12, right: 12, zIndex: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={() => navigation.goBack()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}>
            <SF name="chevron.down" size={18} color="#fff" />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
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
              <Text style={[ty.headline, { color: '#fff', marginTop: 12, textAlign: 'center' }]}>Этот урок доступен по подписке</Text>
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
          <Text style={[ty.title3, { color: T.label }]}>{lesson.title}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]}>Урок {lesson.n} из {course.lessons.length} · {course.title}</Text>
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Segmented items={['Заметки', 'Материалы', 'Обсуждение']} value={tab} onChange={setTab} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
          {tab === 0 ? (
            lesson.description ? (
              <View style={{ paddingHorizontal: 20 }}>
                <Text style={[ty.body, { color: T.label }]}>{lesson.description}</Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 16 }}>
                {NOTES.map((nt, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.brandTinted, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, height: 24, alignSelf: 'flex-start' }}>
                      <SF name="clock.fill" size={11} color={T.brand} />
                      <Text style={[ty.caption2Em, { color: T.brand }]}>{nt.t}</Text>
                    </View>
                    <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>{nt.n}</Text>
                  </View>
                ))}
              </View>
            )
          ) : (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={[ty.subhead, { color: T.labelSecondary }]}>{tab === 1 ? 'Материалы появятся здесь' : 'Обсуждение урока'}</Text>
            </View>
          )}
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
