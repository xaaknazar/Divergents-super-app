import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../../components/SFIcon';
import { Segmented, PrimaryButton, T, ty } from '../../components/ui';
import { useCourses } from '../../state/CourseContext';
import { getCourse } from '../../data/courses';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'Video'>;

const NOTES = [
  { t: '04:18', n: 'Первый закон — личная ответственность. Лидер берёт ответственность за весь результат.' },
  { t: '11:42', n: 'Связать с Command — мой топ-2 талант. Использовать в делегировании.' },
  { t: '14:55', n: 'Кейс из Kaspi: как Михаил Ломтадзе делегирует решения.' },
];

export function VideoScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { courseId, lessonId } = route.params;
  const course = getCourse(courseId)!;
  const lesson = course.lessons.find((l) => l.id === lessonId) ?? course.lessons[0];
  const { completeLesson, isCompleted } = useCourses();
  const [playing, setPlaying] = useState(true);
  const [tab, setTab] = useState(0);
  const alreadyDone = isCompleted(courseId, lesson.id);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Video area */}
      <View style={{ paddingTop: insets.top, height: 240 + insets.top, backgroundColor: '#0E1729' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {/* Top controls */}
          <View style={{ position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable onPress={() => navigation.goBack()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
              <SF name="chevron.down" size={18} color="#fff" />
            </Pressable>
            <View style={{ alignItems: 'center' }}>
              <Text style={[ty.subheadEm, { color: '#fff' }]}>Урок {lesson.n}</Text>
              <Text style={[ty.caption2, { color: 'rgba(255,255,255,0.7)' }]}>{lesson.title}</Text>
            </View>
            <Pressable style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
              <SF name="ellipsis" size={16} color="#fff" />
            </Pressable>
          </View>

          {/* Center play/pause */}
          <Pressable onPress={() => setPlaying((v) => !v)} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            <SF name={playing ? 'pause.fill' : 'play.fill'} size={28} color="#fff" />
          </Pressable>

          {/* Bottom controls */}
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={[ty.caption1, { color: 'rgba(255,255,255,0.85)' }]}>16:00</Text>
              <Text style={[ty.caption1, { color: 'rgba(255,255,255,0.85)' }]}>{lesson.minutes}:00</Text>
            </View>
            <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2 }}>
              <View style={{ width: '57%', height: '100%', backgroundColor: '#fff', borderRadius: 2 }} />
              <View style={{ position: 'absolute', left: '57%', top: -4, width: 11, height: 11, backgroundColor: '#fff', borderRadius: 6, marginLeft: -5 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <SF name="airplayvideo" size={20} color="rgba(255,255,255,0.8)" />
              <View style={{ flexDirection: 'row', gap: 26, alignItems: 'center' }}>
                <SF name="gobackward.15" size={26} color="#fff" />
                <Pressable onPress={() => setPlaying((v) => !v)}><SF name={playing ? 'pause.fill' : 'play.fill'} size={32} color="#fff" /></Pressable>
                <SF name="goforward.15" size={26} color="#fff" />
              </View>
              <SF name="arrow.up.left.and.arrow.down.right" size={18} color="rgba(255,255,255,0.8)" />
            </View>
          </View>
        </View>
      </View>

      {/* Sheet */}
      <View style={{ flex: 1, backgroundColor: T.systemBg, borderTopLeftRadius: 14, borderTopRightRadius: 14, marginTop: -2 }}>
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: T.fillSecondary }} />
        </View>
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <Text style={[ty.title3, { color: T.label }]}>{lesson.title}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]}>Урок {lesson.n} из {course.lessons.length} · {lesson.minutes} мин · {course.author}</Text>
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Segmented items={['Заметки', 'Материалы', 'Обсуждение']} value={tab} onChange={setTab} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
          {tab === 0 ? (
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
          ) : (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={[ty.subhead, { color: T.labelSecondary }]}>{tab === 1 ? 'Материалы появятся здесь' : 'Обсуждение урока'}</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Complete CTA */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: 'rgba(249,249,249,0.96)', borderTopWidth: 0.5, borderTopColor: T.separator }}>
        <PrimaryButton
          label={alreadyDone ? 'Урок завершён ✓' : 'Завершить урок'}
          icon={alreadyDone ? 'checkmark' : undefined}
          color={alreadyDone ? T.green : T.brand}
          onPress={() => { completeLesson(courseId, lesson.id); navigation.goBack(); }}
        />
      </View>
    </View>
  );
}
