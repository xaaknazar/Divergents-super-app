// Custom iOS-style tab bar (blur surface, brand active colour, SF icons).
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, ty } from '../theme/tokens';
import { SF, SFName } from '../components/SFIcon';

const TABS: Record<string, { label: string; on: SFName; off: SFName }> = {
  LMSTab: { label: 'Обучение', on: 'book.fill', off: 'book' },
  AITab: { label: 'AI', on: 'sparkles', off: 'sparkles' },
  CommunityTab: { label: 'Сообщество', on: 'person.3.fill', off: 'person.3' },
  CareerTab: { label: 'Карьера', on: 'briefcase.fill', off: 'briefcase' },
  ProfileTab: { label: 'Профиль', on: 'person.crop.circle.fill', off: 'person.crop.circle' },
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // Hide the tab bar when a detail screen is pushed inside the active tab's
  // stack (nested index > 0) so bottom CTAs aren't covered by the bar.
  const active = state.routes[state.index] as any;
  const nestedIndex = active?.state?.index ?? 0;
  if (nestedIndex > 0) return null;
  return (
    <BlurView intensity={80} tint="light" style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingBottom: Math.max(insets.bottom, 10), paddingTop: 8,
      borderTopWidth: 0.5, borderTopColor: T.separator,
      backgroundColor: 'rgba(249,249,249,0.80)',
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start' }}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = TABS[route.name];
          if (!meta) return null;
          const color = focused ? T.brand : T.labelTertiary;
          return (
            <Pressable key={route.key} onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }} style={{ alignItems: 'center', gap: 3, paddingHorizontal: 10, minWidth: 56 }}>
              <SF name={focused ? meta.on : meta.off} size={25} color={color} />
              <Text style={[ty.caption2, { color, fontWeight: '500' }]}>{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </BlurView>
  );
}
