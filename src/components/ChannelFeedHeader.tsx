import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ServerChannelPost } from '../data/api';
import { useTheme } from '../theme/ThemeContext';
import { Segmented } from './Segmented';

export type ChannelPostFilter = 'all' | 'article' | 'audio';
export function ChannelFeedHeader({ posts, value, onChange }: {
  posts: ServerChannelPost[]; value: ChannelPostFilter; onChange: (value: ChannelPostFilter) => void;
}) {
  const { T, ty } = useTheme();
  const options = [
    { key: 'all' as const, label: 'Все' },
    ...(posts.some(p => p.type === 'article') ? [{ key: 'article' as const, label: 'Статьи' }] : []),
    ...(posts.some(p => p.type === 'audio') ? [{ key: 'audio' as const, label: 'Аудио' }] : []),
  ];
  return <View style={styles.header}>
    <View style={styles.heading}><Text accessibilityRole="header" style={[ty.title2, { color: T.label }]}>Публикации</Text>
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>{posts.length}</Text></View>
    {options.length > 2 ? <Segmented items={options.map(o => o.label)} value={Math.max(0, options.findIndex(o => o.key === value))}
      onChange={index => onChange(options[index].key)} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 14 },
  heading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
});
