import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { word } from '../data/plural';
import { GlassSurface } from './GlassSurface';
import { ChannelArtwork } from './ChannelArtwork';
import { ChannelGlassControl } from './ChannelGlassControl';
import { useChannelAppearance } from './useChannelAppearance';

export function ChannelFloatingHeader({ name, avatar, members, onBack, onInfo }: {
  name: string; avatar?: string | null; members?: number; onBack: () => void; onInfo: () => void;
}) {
  const C = useChannelAppearance();
  return <View style={styles.row}>
    <ChannelGlassControl icon="chevron.left" label="Назад к каналам" onPress={onBack} />
    <Pressable onPress={onInfo} accessibilityRole="button" accessibilityLabel={`О канале ${name}`} style={styles.identity}>
      <GlassSurface style={styles.pill} variant="navigation" interactive>
        <Text style={[styles.name, { color: C.glassInk, fontSize: 17 * C.textScale }]} numberOfLines={2}>{name}</Text>
        <Text style={[styles.members, { color: C.glassInk, fontSize: 12 * C.textScale }]}>
          {members == null ? 'Канал' : `${members.toLocaleString('ru-RU')} ${word(members, 'подписчик', 'подписчика', 'подписчиков')}`}
        </Text>
      </GlassSurface>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Открыть информацию о канале" onPress={onInfo} style={styles.avatar}>
      <ChannelArtwork uri={avatar} name={name} size="navigation" />
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  identity: { flex: 1, minWidth: 0 }, pill: { borderRadius: 32, minHeight: 50, paddingHorizontal: 14, paddingVertical: 8 },
  name: { fontWeight: '600', textAlign: 'center', letterSpacing: -0.3 },
  members: { textAlign: 'center', marginTop: 1, opacity: 0.85 },
  avatar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
