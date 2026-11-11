import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { AttendanceParticipant, AttendanceStatus } from '../data/eventAttendance';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';
import { EventAttendanceRow } from './EventAttendanceRow';
import { Button } from './Button';
import { EmptyState } from './StateViews';
export function EventAttendanceRoster({ participants, loading, error, onRefresh, onSave }: {
  participants: AttendanceParticipant[]; loading?: boolean; error?: string;
  onRefresh: () => void; onSave: (id: string, status: AttendanceStatus, comment: string) => Promise<void>;
}) {
  const { T, ty } = useTheme();
  if (loading && !participants.length) return <View style={styles.loading}><ActivityIndicator color={T.brandText} accessibilityLabel="Загрузка участников" /></View>;
  if (error) return <View style={styles.loading}><Text style={[ty.body, { color: T.label }]}>{error}</Text><Button label="Повторить" onPress={onRefresh} /></View>;
  if (!participants.length) return <EmptyState icon="person.2.fill" title="Нет принятых участников" subtitle="Здесь появятся те, чьи заявки вы приняли." />;
  const marked = participants.filter(p => p.record).length;
  return <FlatList data={participants} keyExtractor={p => p.applicationId} keyboardShouldPersistTaps="handled"
    refreshing={!!loading} onRefresh={onRefresh} contentContainerStyle={styles.list}
    ListHeaderComponent={<View style={styles.summary}><Text style={[ty.headline, nums, { color: T.label }]}>Отмечено {marked} из {participants.length}</Text>
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>Нажмите на отметку под именем. Её можно изменить.</Text></View>}
    renderItem={({ item }) => <EventAttendanceRow participant={item} onSave={onSave} onRefresh={onRefresh} />}
    ItemSeparatorComponent={() => <View style={styles.gap} />} />;
}
const styles = StyleSheet.create({ list: { padding: 16, paddingBottom: 40 }, summary: { gap: 6, paddingBottom: 20 }, gap: { height: 12 }, loading: { padding: 24, gap: 16 } });
