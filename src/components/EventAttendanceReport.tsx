import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ATTENDANCE_OPTIONS } from '../data/eventAttendance';
import type { AttendanceFlag, AttendanceVisit } from '../data/eventManagement';
import { ListSection } from './ListSection';
import { Button } from './Button';
import { InlineNotice } from './InlineNotice';
import { SF } from './SFIcon';
export function EventAttendanceReport({ flags, visits = [], loading, error, onRetry, own = false, onMark, onRevoke }: {
  flags: AttendanceFlag[]; visits?: AttendanceVisit[]; loading?: boolean; error?: string; onRetry: () => void; own?: boolean; onMark?: () => void; onRevoke?: () => void;
}) {
  const { T, ty } = useTheme();
  return <ListSection header="Посещение мероприятий">
    <View style={styles.body}>
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>{own ? 'Отметки организаторов видны вам и организаторам встреч, на которые вы подали заявку. При ошибке обратитесь к организатору.' : 'Посещения по принятым заявкам и комментарии организаторов.'}</Text>
      {loading ? <ActivityIndicator accessibilityLabel="Загрузка отметок о встречах" color={T.brand} /> : error ? <><InlineNotice message={error} /><Button label="Повторить" variant="plain" onPress={onRetry} /></> : <>
        {visits.map(visit => {
          const option = ATTENDANCE_OPTIONS.find(o => o.status === visit.status);
          return <View key={visit.id} style={[styles.report, { borderTopColor: T.separator }]}>
            <View style={styles.heading}><Text accessible={false} style={styles.emoji}>{option?.emoji}</Text><Text style={[ty.headline, styles.title, { color: T.label }]}>{option?.label ?? 'Посещение'}</Text></View>
            <Text style={[ty.subheadEm, { color: T.label }]}>{visit.eventTitle}</Text>
            {visit.comment ? <Text style={[ty.body, { color: T.label }]}>{visit.comment}</Text> : null}
            <Text style={[ty.caption1, { color: T.labelSecondary }]}>Отметка организатора · {new Date(visit.updatedAt).toLocaleDateString('ru-RU')}</Text>
          </View>;
        })}
        {!flags.length && !visits.length ? <Text style={[ty.body, { color: T.label }]}>Пока нет отметок о посещении</Text> : flags.map(flag => <View key={flag.id} style={[styles.report, { borderTopColor: T.separator }]}>
          <View style={styles.heading}><View style={[styles.badge, { backgroundColor: T.fillSecondary }]}><SF name="exclamationmark.bubble" size={19} color={T.orangeText} /></View><Text style={[ty.headline, styles.title, { color: T.label }]}>{flag.reason === 'no_show' ? 'Не пришёл' : 'Нарушение правил'}</Text></View>
          <Text style={[ty.subheadEm, { color: T.label }]}>{flag.eventTitle}</Text>
          {flag.eventDate ? <Text style={[ty.footnote, { color: T.labelSecondary }]}>{flag.eventDate.replace('T',' ').slice(0,16)} · время встречи</Text> : null}
          <Text style={[ty.body, { color: T.label }]}>{flag.note}</Text>
          <Text style={[ty.caption1, { color: T.labelSecondary }]}>Отметка организатора · {new Date(flag.createdAt).toLocaleDateString('ru-RU')}</Text>
        </View>)}
        {onMark ? <Button label={onRevoke ? 'Изменить отметку этой встречи' : 'Добавить отметку этой встречи'} icon="square.and.pencil" variant="tinted" onPress={onMark} /> : null}
        {onRevoke ? <Button label="Снять отметку этой встречи" variant="plain" onPress={onRevoke} /> : null}
      </>}
    </View>
  </ListSection>;
}
const styles = StyleSheet.create({ emoji: { fontSize: 24 }, body: { padding: 16, gap: 14 }, report: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, gap: 6 }, badge: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, heading: { flexDirection: 'row', gap: 8, alignItems: 'center' }, title: { flex: 1 } });
