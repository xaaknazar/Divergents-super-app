import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { EventManagement } from '../data/eventManagement';
import { useTheme } from '../theme/ThemeContext';
import { ListSection } from './ListSection';
import { ListRow } from './ListRow';
import { InlineNotice } from './InlineNotice';
import { Button } from './Button';
/** Presentational half of EventManagementPanel, shared with its isolated previews. */
export function EventManagementContent({ data, loading, error, busy, onRetry, onEdit, onAnnounce, onAttendance, onComplete }: {
  data: EventManagement | null; loading?: boolean; error?: string; busy?: boolean;
  onRetry: () => void; onEdit: () => void; onAnnounce: () => void; onAttendance: () => void; onComplete: () => void;
}) {
  const { T, ty } = useTheme();
  return <View style={styles.content}>
    {error ? <ListSection header="Новости встречи"><View style={styles.copy}><InlineNotice message={error} /><Button label="Повторить" variant="plain" onPress={onRetry} /></View></ListSection> : null}
    {loading && !data ? <ActivityIndicator accessibilityLabel="Загрузка новостей встречи" color={T.brand} /> : null}
    {data?.canManage ? <ListSection header="Управление встречей">
      {!data.finished ? <ListRow title="Изменить данные" subtitle="Описание, место, время и количество мест" chevron onPress={onEdit} /> : null}
      <ListRow title="Сообщение участникам" subtitle="Опубликовать дополнение и уведомить принятых" chevron onPress={onAnnounce} />
      {data.canTakeAttendance ? <View style={styles.copy}><Button label="Отметить участников" icon="person.2.fill" onPress={onAttendance} /></View>
        : <View style={styles.copy}><Text style={[ty.footnote, { color: T.labelSecondary }]}>Отметки участников появятся с началом встречи.</Text></View>}
      {!data.finished && data.canComplete ? <View style={styles.copy}><Button label="Завершить встречу" variant="plain" loading={busy} onPress={onComplete} /></View> : null}
    </ListSection> : null}
    {data?.announcements.length ? <ListSection header="Сообщения организатора">{data.announcements.map(a => <View key={a.id} style={[styles.copy, { borderBottomColor: T.separator, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[ty.footnote, { color: T.labelSecondary }]}>{new Date(a.createdAt).toLocaleString('ru-RU')}</Text>
      <Text style={[ty.body, { color: T.label }]}>{a.text}</Text>
    </View>)}</ListSection> : null}
  </View>;
}
const styles = StyleSheet.create({ content: { gap: 16 }, copy: { padding: 16, gap: 8 } });
