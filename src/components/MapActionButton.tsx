import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hSelect } from '../lib/haptics';
import { useTheme } from '../theme/ThemeContext';
import { MapGlassMaterial } from './MapGlassMaterial';
import { SF } from './SFIcon';

export function MapActionButton({ icon, label, onPress, onLongPress, primary = false, badge }: {
  icon: string; label: string; onPress: () => void; onLongPress?: () => void; primary?: boolean; badge?: number;
}) {
  const { ty } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={badge ? `${label}. ${badge}` : label}
    onPress={() => { hSelect(); onPress(); }} onLongPress={onLongPress}
    style={({ pressed }) => [styles.button, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
    <MapGlassMaterial role={primary ? 'primary' : 'control'} />
    <SF name={icon} size={23} color={primary ? '#FFFFFF' : '#234088'} />
    {badge ? <View style={styles.badge}><Text style={[ty.caption2Em, styles.badgeText]}>{badge > 99 ? '99+' : badge}</Text></View> : null}
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#06152E', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  badge: { position: 'absolute', right: -3, top: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: '#234088', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF' },
});
