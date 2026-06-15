// Navigation headers — large title (root tabs) + inline back (detail screens).
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { T, ty } from '../theme/tokens';
import { SF } from './SFIcon';

export function NavBarLarge({ title, trailing }: { title: string; trailing?: React.ReactNode }) {
  return (
    <View>
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>{trailing}</View>
      </View>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 }}>
        <Text style={[ty.largeTitle, { color: T.label }]}>{title}</Text>
      </View>
    </View>
  );
}

export function BackNav({
  back = 'Назад', onBack, trailing, transparent = false,
}: { back?: string; onBack?: () => void; trailing?: React.ReactNode; transparent?: boolean }) {
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingTop: 6, paddingBottom: 10, paddingLeft: 12, paddingRight: 8,
      backgroundColor: transparent ? 'transparent' : 'rgba(249,249,249,0.96)',
      borderBottomWidth: transparent ? 0 : 0.33, borderBottomColor: T.separator,
    }}>
      <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel={back} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, padding: 6 }}>
        <SF name="chevron.left" size={20} color={T.brandAccent} />
        <Text style={[ty.body, { color: T.brandAccent }]}>{back}</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 16, paddingRight: 6, alignItems: 'center' }}>{trailing}</View>
    </View>
  );
}

// Trailing icon button helper
export function HeaderIcon({ name, color = T.brandAccent, size = 20, onPress, badge }: {
  name: string; color?: string; size?: number; onPress?: () => void; badge?: number;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={name} style={{ position: 'relative' }}>
      <SF name={name} size={size} color={color} />
      {badge ? (
        <View style={{ position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
          <Text style={[ty.caption2Em, { color: '#fff' }]}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
