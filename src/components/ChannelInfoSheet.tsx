import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChannelHero, ChannelHeroProps } from './ChannelHero';
import { ChannelGlassControl } from './ChannelGlassControl';
import { Button } from './Button';
import { useChannelAppearance } from './useChannelAppearance';

export function ChannelInfoSheet({ onClose, onModerate, ...hero }: ChannelHeroProps & { onClose: () => void; onModerate: () => void }) {
  const C = useChannelAppearance();
  const insets = useSafeAreaInsets();
  return <View style={[styles.sheet, { backgroundColor: C.surface, paddingTop: Math.max(insets.top, 12) }]}>
    <View style={styles.toolbar}><ChannelGlassControl icon="xmark" label="Закрыть информацию о канале" onPress={onClose} /></View>
    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
      <ChannelHero {...hero} />
      {!hero.owner ? <View style={styles.moderation}><Button label="Пожаловаться или заблокировать" variant="plain" onPress={onModerate} /></View> : null}
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  sheet: { flex: 1 }, toolbar: { alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 8 },
  moderation: { paddingHorizontal: 20 },
});
