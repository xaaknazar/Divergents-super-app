import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { AttendanceFlag } from '../data/eventManagement';
import { ListSection } from './ListSection';
import { Button } from './Button';
import { InlineNotice } from './InlineNotice';
import { SF } from './SFIcon';
export function EventAttendanceReport({ flags, loading, error, onRetry, own = false, onMark, onRevoke }: {
  flags: AttendanceFlag[]; loading?: boolean; error?: string; onRetry: () => void; own?: boolean; onMark?: () => void; onRevoke?: () => void;
}) {
  const { T, ty } = useTheme();
  return <ListSection header="Посещение мероприятий">
    <View style={styles.body}>
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>{own ? 'Отметки организаторов видны вам и организаторам встреч, на которые вы подали заявку. При ошибке обратитесь к организатору.' : 'Отметки организаторов по принятым заявкам. Причина и пояснение помогут при рассмотрении следующей заявки.'}</Text>
      {loading ? <ActivityIndicator accessibilityLabel="Загрузка отметок о встречах" color={T.brand} /> : error ? <><InlineNotice message={error} /><Button label="Повторить" variant="plain" onPress={onRetry} /></> : <>
        {!flags.length ? <Text style={[ty.body, { color: T.label }]}>Отметок о пропусках и нарушениях нет</Text> : flags.map(flag => <View key={flag.id} style={[styles.report, { borderTopColor: T.separator }]}>
          <View style={styles.heading}><View style={[styles.badge, { backgroundColor: T.fillSecondary }]}><SF name={flag.reason === 'no_show' ? 'calendar' : 'exclamationmark.bubble'} size={19} color={T.orangeText} /></View><Text style={[ty.headline, styles.title, { color: T.label }]}>{flag.reason === 'no_show' ? 'Не пришёл' : 'Нарушение правил'}</Text></View>
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
const styles = StyleSheet.create({ body: { padding: 16, gap: 14 }, report: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, gap: 6 }, badge: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, heading: { flexDirection: 'row', gap: 8, alignItems: 'center' }, title: { flex: 1 } });
