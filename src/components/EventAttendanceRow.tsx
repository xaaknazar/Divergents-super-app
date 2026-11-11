import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ATTENDANCE_OPTIONS, AttendanceParticipant, AttendanceStatus } from '../data/eventAttendance';
import { useTheme } from '../theme/ThemeContext';
import { ContentBlock } from './ContentBlock';
import { MemberAvatar } from './MemberAvatar';
import { HalfSheet } from './HalfSheet';
import { Button } from './Button';
import { EventTextField } from './EventTextField';
export function EventAttendanceRow({ participant, onSave, onRefresh }: {
  participant: AttendanceParticipant; onSave: (id: string, status: AttendanceStatus, comment: string) => Promise<void>; onRefresh: () => void;
}) {
  const { T, ty, textScale = 1 } = useTheme(); const { fontScale, width } = useWindowDimensions();
  const [busy, setBusy] = useState(false), [error, setError] = useState<string>();
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState('');
  const lock = useRef(false);
  const record = participant.record;
  const stacked = fontScale * textScale > 1.25 || width < 350;
  const save = async (status: AttendanceStatus, comment = record?.comment ?? '') => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(undefined);
    try { await onSave(participant.applicationId, status, comment); setEditing(false); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить. Проверьте связь и повторите.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <ContentBlock><View style={styles.content}>
    <View style={styles.heading}><MemberAvatar name={participant.name} />
      <View style={styles.flex}><Text style={[ty.headline, { color: T.label }]}>{participant.name}</Text>
        <Text accessibilityLiveRegion="polite" style={[ty.footnote, { color: T.labelSecondary }]}>{busy ? 'Сохраняем…' : record ? 'Отметка сохранена' : 'Ещё не отмечен'}</Text></View>
      {busy ? <ActivityIndicator color={T.brandText} accessibilityLabel="Сохранение отметки" /> : null}
    </View>
    <View accessibilityRole="radiogroup" accessibilityLabel={`Посещение: ${participant.name}`} style={[styles.options, stacked && styles.stacked]}>
      {ATTENDANCE_OPTIONS.map(option => {
        const selected = record?.status === option.status;
        return <Pressable key={option.status} accessibilityRole="radio" accessibilityLabel={`${participant.name}: ${option.label}`}
          accessibilityState={{ checked: selected, selected, disabled: busy }} disabled={busy} onPress={() => { if (!selected) void save(option.status); }}
          style={({ pressed }) => [styles.option, stacked && styles.stackedOption, { backgroundColor: selected ? T.brandTinted : T.fillQuaternary,
            borderColor: selected ? T.brandText : 'transparent', opacity: pressed ? 0.65 : 1 }]}>
          <Text accessible={false} style={styles.emoji}>{option.emoji}</Text>
          <Text style={[ty.footnoteEm, styles.optionText, { color: selected ? T.brandText : T.labelSecondary }]}>{option.label}</Text>
        </Pressable>;
      })}
    </View>
    {record ? <Pressable accessibilityRole="button" accessibilityLabel={`${record.comment ? 'Изменить' : 'Добавить'} комментарий: ${participant.name}`}
      disabled={busy} onPress={() => { setDraft(record.comment); setError(undefined); setEditing(true); }} style={styles.comment}>
      <Text style={[ty.subhead, { color: record.comment ? T.label : T.brandText }]}>{record.comment || '+ Комментарий'}</Text>
    </Pressable> : null}
    {error && !editing ? <View accessibilityLiveRegion="polite"><Text style={[ty.subhead, { color: T.redText }]}>{error}</Text>
      <Button label="Обновить список" variant="plain" onPress={() => { setError(undefined); onRefresh(); }} /></View> : null}
    {editing && record ? <HalfSheet visible title={participant.name} onClose={() => { if (!busy) setEditing(false); }}
      footer={<Button label="Сохранить комментарий" loading={busy} onPress={() => void save(record.status, draft)} />}>
      <EventTextField label="Комментарий — по желанию" required={false} mode="note" value={draft} onChange={setDraft} disabled={busy} />
      {error ? <Text accessibilityRole="alert" style={[ty.subhead, { color: T.redText }]}>{error}</Text> : null}
    </HalfSheet> : null}
  </View></ContentBlock>;
}
const styles = StyleSheet.create({ content: { gap: 12 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 12 }, flex: { flex: 1, minWidth: 0 },
  options: { flexDirection: 'row', gap: 8 }, stacked: { flexDirection: 'column' },
  option: { flex: 1, minHeight: 70, borderRadius: 16, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 5 },
  stackedOption: { flex: 0, flexDirection: 'row', minHeight: 52, gap: 10 }, emoji: { fontSize: 24 }, optionText: { textAlign: 'center', flexShrink: 1 },
  comment: { minHeight: 48, justifyContent: 'center', paddingVertical: 8 },
});
