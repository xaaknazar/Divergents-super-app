// Custom iOS-style tab bar (blur surface, brand active colour, SF icons).
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ty } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { SF, SFName } from '../components/SFIcon';
import { hSelect } from '../lib/haptics';
import { useLang } from '../state/LanguageContext';

const TABS: Record<string, { label: 'tab_learn' | 'tab_ai' | 'tab_community' | 'tab_map' | 'tab_career' | 'tab_profile'; on: SFName; off: SFName }> = {
  LMSTab: { label: 'tab_learn', on: 'book.fill', off: 'book' },
  AITab: { label: 'tab_ai', on: 'sparkles', off: 'sparkles' },
  CommunityTab: { label: 'tab_community', on: 'person.3.fill', off: 'person.3' },
  MapTab: { label: 'tab_map', on: 'map.fill', off: 'map' },
  CareerTab: { label: 'tab_career', on: 'briefcase.fill', off: 'briefcase' },
  ProfileTab: { label: 'tab_profile', on: 'person.crop.circle.fill', off: 'person.crop.circle' },
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { T, isDark } = useTheme();
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  // Hide the tab bar when a detail screen is pushed inside the active tab's
  // stack (nested index > 0) so bottom CTAs aren't covered by the bar.
  const active = state.routes[state.index] as any;
  const nestedIndex = active?.state?.index ?? 0;
  if (nestedIndex > 0) return null;
  return (
    <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingBottom: Math.max(insets.bottom, 10), paddingTop: 8,
      borderTopWidth: 0.5, borderTopColor: T.separator,
      backgroundColor: isDark ? 'rgba(18,22,33,0.86)' : 'rgba(249,249,249,0.80)',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 4 }}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = TABS[route.name];
          if (!meta) return null;
          const color = focused ? T.brand : T.labelTertiary;
          return (
            <Pressable key={route.key} onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }} style={{ flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 2 }}>
              <SF name={focused ? meta.on : meta.off} size={24} color={color} />
              <Text numberOfLines={1} style={[ty.caption2, { color, fontWeight: '500', fontSize: 10, lineHeight: 13 }]}>{t(meta.label)}</Text>
            </Pressable>
          );
        })}
      </View>
    </BlurView>
  );
}
