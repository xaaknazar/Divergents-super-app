import React from 'react';
import { View, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavBarLarge, HeaderIcon } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { ProgressBar, Capsule, IconCircle, IconSquircle, ListSection, ListRow, T, ty } from '../../components/ui';
import { USER, TALENTS, REPORTS, APPLICATIONS } from '../../data/profile';
import { useChallenge } from '../../state/ChallengeContext';
import { useCourses, COURSES } from '../../state/CourseContext';
import { ProfileStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParams, 'ProfileHome'>;

export function ProfileHomeScreen({ navigation }: Props) {
  const { challenge } = useChallenge();
  const { progress } = useCourses();
  const coursesInProgress = COURSES.filter((c) => progress(c.id) > 0).length;

  const stats = [
    { v: String(coursesInProgress), l: 'Курсов' },
    { v: String(USER.stats.challenges), l: 'Челленджа' },
    { v: String(USER.stats.books), l: 'Книги' },
  ];

  const challenges = [
    { t: challenge.title, p: challenge.currentDay / challenge.totalDays, e: `${challenge.currentDay}/${challenge.totalDays}` },
    { t: '20 страниц в день', p: 18 / 30, e: '18/30' },
    { t: '10 км ходьбы', p: 6 / 14, e: '6/14' },
  ];

  const goLeadership = () => navigation.getParent()?.getParent()?.navigate('Tabs', { screen: 'LMSTab', params: { screen: 'CourseDetail', params: { courseId: 'leadership' } } });

  return (
    <Screen>
      <NavBarLarge title="Профиль" trailing={<>
        <HeaderIcon name="square.and.arrow.up" />
        <HeaderIcon name="gearshape" />
      </>} />

      {/* Hero */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ width: 80, height: 80, borderRadius: 18, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Text style={[ty.largeTitle, { color: '#fff' }]}>{USER.initial}</Text>
        </View>
        <Text style={[ty.title1, { color: T.label }]}>{USER.name}</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]}>{USER.role}</Text>
        <View style={{ marginTop: 10 }}>
          <Capsule bg={T.fillTertiary} color={T.label}><SF name="circle.fill" size={8} color={T.orange} />{USER.psychotype} · Уровень {USER.level}</Capsule>
        </View>
      </View>

      {/* Stats row */}
      <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: T.cardBg, borderRadius: 14, flexDirection: 'row', paddingVertical: 14 }}>
        {stats.map((s, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < stats.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
            <Text style={[ty.title2, { color: T.label }]}>{s.v}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* Reminders */}
      <ListSection header="Напоминания · 2">
        <ListRow leading={<IconCircle icon="bell.badge.fill" color="#fff" bg={T.orange} size={30} />} title="Завершите тест Gardner" subtitle="Осталось 12 вопросов · 8 минут" chevron />
        <ListRow leading={<IconCircle icon="book.fill" color="#fff" bg={T.brand} size={30} />} title='Урок "Законы лидерства 2"' subtitle="Не открывали 3 дня" chevron last onPress={goLeadership} />
      </ListSection>

      {/* Current work */}
      <ListSection header="Сейчас работает">
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <IconSquircle icon="building.2.fill" bg={T.brand} size={38} />
            <View style={{ flex: 1 }}>
              <Text style={[ty.headline, { color: T.label }]}>HR-директор</Text>
              <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 1 }]}>KEX Group · с янв 2023</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <Capsule bg={T.fillTertiary} color={T.labelSecondary}>1500+ сотрудников</Capsule>
                <Capsule bg={T.fillTertiary} color={T.labelSecondary}>70 точек</Capsule>
                <Capsule bg={T.fillTertiary} color={T.labelSecondary}>F&B</Capsule>
              </View>
            </View>
          </View>
        </View>
      </ListSection>

      {/* Personal data */}
      <ListSection header="Личные данные">
        <ListRow leading={<SF name="person.fill" size={20} color={T.brandAccent} />} title="Возраст" detail={USER.age} />
        <ListRow leading={<SF name="mappin.circle.fill" size={20} color={T.red} />} title="Город" detail={USER.city} />
        <ListRow leading={<SF name="heart.fill" size={20} color={T.pink} />} title="Семейное" detail={USER.family} />
        <ListRow leading={<SF name="envelope.fill" size={20} color={T.brand} />} title="Email" detail={USER.email} />
        <ListRow leading={<SF name="phone.fill" size={20} color={T.green} />} title="Телефон" detail={USER.phone} last />
      </ListSection>

      {/* Top talents */}
      <ListSection header="Топ талантов Gallup">
        {TALENTS.map((tn, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16 }}>
            <Text style={[ty.footnoteEm, { color: T.labelSecondary, width: 24 }]}>{String(tn.i).padStart(2, '0')}</Text>
            <Text style={[ty.body, { color: T.label, width: 100 }]}>{tn.t}</Text>
            <View style={{ flex: 1 }}><ProgressBar value={tn.v} /></View>
            <Text style={[ty.footnoteEm, { color: T.labelSecondary, width: 36, textAlign: 'right' }]}>{Math.round(tn.v * 100)}</Text>
            {i < TALENTS.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 52, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
          </View>
        ))}
        <ListRow title="Смотреть все 34 таланта" valueColor={T.brand} chevron last leading={<View style={{ width: 24 }} />} />
      </ListSection>

      {/* Reports */}
      <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 36, paddingTop: 16, paddingBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }]}>Отчёты Divergents</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 }}>
        {REPORTS.map((r) => (
          <View key={r.k} style={{ width: '47.6%', backgroundColor: T.cardBg, borderRadius: 14, padding: 14 }}>
            <IconSquircle icon={r.icon} bg={r.color} size={32} />
            <Text style={[ty.headline, { color: T.label, marginTop: 10 }]}>{r.k}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary }]}>{r.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
              <SF name="checkmark.circle.fill" size={11} color={T.green} />
              <Text style={[ty.caption2Em, { color: T.green }]}>Готов</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Sources */}
      <ListSection header="Источники тестов" style={{ marginTop: 20 }}>
        <ListRow leading={<IconSquircle icon="checkmark" bg={T.green} size={28} />} title="Gallup" detail="34 таланта · Готов" />
        <ListRow leading={<IconSquircle icon="checkmark" bg={T.green} size={28} />} title="MBTI" detail={`${USER.mbti} · Готов`} />
        <ListRow leading={<IconSquircle icon="doc.fill" bg={T.labelTertiary} size={28} />} title="Gardner" detail="Загрузить PDF" valueColor={T.brandAccent} chevron last />
      </ListSection>

      {/* Active challenges */}
      <ListSection header="Активные челленджи · 3">
        {challenges.map((c, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={[ty.body, { color: T.label }]}>{c.t}</Text>
              <View style={{ marginTop: 6 }}><ProgressBar value={c.p} /></View>
            </View>
            <Text style={[ty.subheadEm, { color: T.labelSecondary }]}>{c.e}</Text>
            {i < challenges.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 16, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
          </View>
        ))}
      </ListSection>

      {/* Applications */}
      <ListSection header="Отклики на вакансии · 5">
        {APPLICATIONS.map((a, i) => (
          <ListRow key={i}
            leading={<View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: T.fillQuaternary, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.subheadEm, { color: a.color }]}>{a.initial}</Text></View>}
            title={a.t} subtitle={a.c}
            trailing={<Capsule bg={a.statusBg} color={a.statusColor}>{a.status}</Capsule>}
            last={i === APPLICATIONS.length - 1} />
        ))}
      </ListSection>

      <ListSection>
        <ListRow leading={<SF name="gearshape" size={20} color={T.labelSecondary} />} title="Настройки" chevron last />
      </ListSection>
      <View style={{ height: 30 }} />
    </Screen>
  );
}
