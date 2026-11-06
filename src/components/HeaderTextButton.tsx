// Текстовое действие в шапке («Править», «Сбросить», «Прочитать все») — тем же стеклом, что
// и круглые кнопки навигации (GlassButton): в светлой теме дымчатая капсула с белым текстом.
import React from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { hSelect } from '../lib/haptics';
import { useTheme } from '../theme/ThemeContext';
import { minTouch } from '../theme/tokens';
import { GlassSurface } from './GlassSurface';
import { SF } from './SFIcon';

export function HeaderTextButton({ label, onPress, icon, busy = false, accessibilityLabel }: {
  label: string; onPress?: () => void; icon?: string; busy?: boolean; accessibilityLabel?: string;
}) {
  const { ty } = useTheme();
  const disabled = !onPress || busy;
  const ink = disabled ? 'rgba(255,255,255,0.55)' : '#FFFFFF';
  return <Pressable onPress={onPress ? () => { hSelect(); onPress(); } : undefined} disabled={disabled}
    accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled, busy }}
    style={({ pressed }) => ({ minHeight: minTouch, justifyContent: 'center', transform: [{ scale: pressed ? 0.95 : 1 }], opacity: pressed ? 0.85 : 1 })}>
    <GlassSurface interactive variant="navigation" style={{ minHeight: minTouch - 4, borderRadius: 999, flexDirection: 'row', columnGap: 5, paddingHorizontal: 14 }}>
      {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : icon ? <SF name={icon} size={14} color={ink} /> : null}
      <Text style={[ty.subheadEm, { color: ink }]} numberOfLines={1}>{label}</Text>
    </GlassSurface>
  </Pressable>;
}
