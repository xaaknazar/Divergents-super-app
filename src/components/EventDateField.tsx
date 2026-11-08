import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeContext';
import { FieldLabel } from './FieldLabel';
import { Button } from './Button';

/** Event dates always use the event's existing Kazakhstan timezone, not the device's. */
export function EventDateField({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const { T, ty, scheme } = useTheme();
  const parsed = new Date(value.replace(' ', 'T') + '+05:00');
  const date = Number.isFinite(parsed.getTime()) ? parsed : new Date();
  const commit = (picked: Date) => onChange(new Date(picked.getTime() + 5 * 3600000).toISOString().slice(0,16).replace('T',' '));
  const open = () => DateTimePickerAndroid.open({ value: date, mode: 'date', timeZoneName: 'Asia/Almaty', onChange: (e, day) => {
    if (e.type !== 'set' || !day) return;
    DateTimePickerAndroid.open({ value: day, mode: 'time', is24Hour: true, timeZoneName: 'Asia/Almaty', onChange: (event, time) => { if (event.type === 'set' && time) commit(time); } });
  } });
  return <View style={styles.field}>
    <FieldLabel label="Дата и время" required />
    {Platform.OS === 'ios' ? <DateTimePicker accessibilityLabel="Дата и время встречи" value={date} mode="datetime" display="compact" locale="ru-RU" timeZoneName="Asia/Almaty" themeVariant={scheme} disabled={disabled} onChange={(_, picked) => { if (picked) commit(picked); }} />
      : <Button label={date.toLocaleString('ru-RU', { timeZone: 'Asia/Almaty', dateStyle: 'medium', timeStyle: 'short' })} variant="tinted" disabled={disabled} onPress={open} />}
    <Text style={[ty.footnote, { color: T.labelSecondary }]}>Время по Алматы (UTC+5).</Text>
  </View>;
}
const styles = StyleSheet.create({ field: { gap: 8 } });
