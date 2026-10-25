import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

/** Горизонтальная лента плиток каналов в «Сообществе». Порядок задаёт вызывающий: сначала новое. */
export function CommunityChannelRail({ children }: { children: React.ReactNode }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>{children}</ScrollView>;
}
const styles = StyleSheet.create({ rail: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 18, gap: 12 } });
