import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassSurface } from './GlassSurface';
import { SF } from './SFIcon';
import { useChannelAppearance } from './useChannelAppearance';

export function ChannelGlassControl({ icon, label, caption, disabled = false, busy = false, onPress }: {
  icon?: React.ComponentProps<typeof SF>['name']; label: string; caption?: string;
  disabled?: boolean; busy?: boolean; onPress: () => void;
}) {
  const C = useChannelAppearance();
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => [styles.target, { opacity: pressed ? 0.6 : disabled ? 0.65 : 1 }]}>
    <GlassSurface style={caption ? styles.capsule : styles.circle} variant="navigation" interactive>
      <View style={styles.content}>
        {busy ? <ActivityIndicator color={C.glassInk} /> : icon ? <SF name={icon} size={23} color={C.glassInk} /> : null}
        {caption ? <Text style={[styles.caption, { fontSize: 17 * C.textScale, color: C.glassInk }]}>{caption}</Text> : null}
      </View>
    </GlassSurface>
  </Pressable>;
}
const styles = StyleSheet.create({
  target: { flexShrink: 1 }, circle: { width: 48, height: 48, borderRadius: 24 },
  capsule: { minHeight: 48, borderRadius: 30, paddingVertical: 12, paddingHorizontal: 24 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  caption: { fontWeight: '600', textAlign: 'center', flexShrink: 1 },
});
