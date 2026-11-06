import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useChannelAppearance } from './useChannelAppearance';

export function ChannelDateDivider({ date }: { date: string }) {
  const C = useChannelAppearance();
  const value = new Date(date);
  if (isNaN(value.getTime())) return null;
  const today = new Date();
  const label = value.toDateString() === today.toDateString() ? 'Сегодня' : value.toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', ...(value.getFullYear() !== today.getFullYear() ? { year: 'numeric' as const } : {}),
  });
  return <View style={styles.row}><Text style={[styles.date, { color: C.label, backgroundColor: C.bubble, fontSize: 13 * C.textScale }]}>{label}</Text></View>;
}
const styles = StyleSheet.create({
  row: { alignItems: 'center', paddingVertical: 14 },
  date: { fontWeight: '600', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, overflow: 'hidden' },
});
