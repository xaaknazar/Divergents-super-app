import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { SF } from '../../components/SFIcon';
import { ProgressBar, Capsule, ListSection, PrimaryButton, T, ty } from '../../components/ui';
import { useCourses } from '../../state/CourseContext';
import { getCourse } from '../../data/courses';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'CourseDetail'>;

function RoundBtn({ icon, onPress }: { icon: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}>
      <SF name={icon} size={16} color={T.label} />
    </Pressable>
  );
}

export function CourseDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { courseId } = route.params;
  const course = getCourse(courseId)!;
  const { progress, currentLessonIndex, lessonStatus } = useCourses();
  const p = progress(courseId);
  const curIdx = currentLessonIndex(courseId);
  const curLesson = course.lessons[curIdx];

  const meta = [
    { v: course.lessonsLabel.split(' ')[0], l: 'Уроков' },
    { v: course.durationLabel, l: 'Длит.' },
    { v: `${course.rating}★`, l: 'Рейтинг' },
    { v: course.students, l: 'Студентов' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: T.systemBg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        {/* Hero */}
        <View style={{ height: 280, backgroundColor: '#C1CCE9' }}>
          <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <RoundBtn icon="chevron.left" onPress={() => navigation.goBack()} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <RoundBtn icon="square.and.arrow.up" />
              <RoundBtn icon="bookmark" />
            </View>
          </View>
          <View style={{ position: 'absolute', right: 24, top: insets.top + 60, opacity: 0.5 }}>
            <SF name={course.icon} size={80} color={T.brand} />
          </View>
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 24 }}>
            <Capsule bg="rgba(255,255,255,0.7)" color={T.brand}>{course.level}</Capsule>
            <Text style={[ty.largeTitle, { color: T.label, marginTop: 10 }]}>{course.title}</Text>
            <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]}>{course.author} · Divergents</Text>
          </View>
        </View>

        {/* Meta bar */}
        <View style={{ flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 20, backgroundColor: T.systemBg, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
          {meta.map((m, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < meta.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
              <Text style={[ty.headline, { color: T.label }]}>{m.v}</Text>
              <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 1 }]}>{m.l}</Text>
            </View>
          ))}
        </View>

        {/* Progress card */}
        <View style={{ margin: 16, backgroundColor: T.groupedBg, borderRadius: 14, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={[ty.body, { color: T.label }]}>Ваш прогресс</Text>
            <Text style={[ty.headline, { color: T.brand }]}>{Math.round(p * 100)}%</Text>
          </View>
          <View style={{ marginTop: 10 }}><ProgressBar value={p} /></View>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 6 }]}>Урок {curLesson.n} — {curLesson.title}</Text>
          <PrimaryButton
            label={p > 0 ? 'Продолжить' : 'Начать курс'}
            icon="play.fill"
            style={{ marginTop: 14 }}
            onPress={() => navigation.navigate('Video', { courseId, lessonId: curLesson.id })}
          />
        </View>

        {/* Program */}
        <ListSection header="Программа курса">
          {course.lessons.map((l, i) => {
            const status = lessonStatus(courseId, i);
            const indicator = status === 'done'
              ? <SF name="checkmark.circle.fill" size={26} color={T.green} />
              : status === 'locked'
                ? <SF name="lock.fill" size={20} color={T.labelTertiary} />
                : (
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: status === 'current' ? T.brand : T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[ty.footnoteEm, { color: status === 'current' ? '#fff' : T.labelSecondary }]}>{l.n}</Text>
                  </View>
                );
            const locked = status === 'locked';
            return (
              <Pressable key={l.id} disabled={locked}
                onPress={() => navigation.navigate('Video', { courseId, lessonId: l.id })}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: status === 'current' ? T.brandTinted : 'transparent', opacity: pressed && !locked ? 0.6 : 1 })}>
                {indicator}
                <View style={{ flex: 1 }}>
                  <Text style={[ty.body, { color: locked ? T.labelTertiary : T.label }]}>{l.title}</Text>
                  <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{locked ? `Откроется после №${l.n - 1}` : l.duration}</Text>
                </View>
                {!locked ? <SF name="chevron.forward" size={14} color={T.labelTertiary} /> : null}
                {i < course.lessons.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 54, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
              </Pressable>
            );
          })}
        </ListSection>

        <ListSection header="О курсе">
          <View style={{ padding: 16 }}>
            <Text style={[ty.body, { color: T.label }]}>{course.description}</Text>
          </View>
        </ListSection>
      </ScrollView>
    </View>
  );
}
