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

// Pushed detail / modal screens that hide the bar (they have their own back
// button + bottom CTAs). Everything else — including tab roots and any state
// that hasn't initialised yet — keeps the bar VISIBLE (fail-safe), so the bar
// never disappears on the main screens.
const DETAIL_ROUTES = new Set([
  'Catalog', 'CourseDetail', 'Video', 'Books', 'BookDetail', 'BookAI',
  'ChallengeDetail', 'JoinChallenge', 'TripDetail', 'Channel', 'ChannelPost',
  'PlaceDetail', 'AddPlace', 'OfflineMap',
  'VacancyDetail', 'Resume', 'TalentProfile',
  'Achievements', 'Personalize',
]);

// Walk to the currently focused leaf route inside a (possibly nested) navigator
// state. Keying on the visible screen — rather than the active tab's stack
// depth — keeps the bar correct after cross-tab navigation that leaves a tab's
// stack non-empty in the background.
function focusedLeafName(route: { name: string; state?: any }): string {
  let r: any = route;
  while (r?.state && typeof r.state.index === 'number' && Array.isArray(r.state.routes)) {
    r = r.state.routes[r.state.index];
  }
  return r?.name ?? route.name;
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { T, isDark } = useTheme();
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const active = state.routes[state.index] as { name: string; state?: any };
  const leaf = focusedLeafName(active);
  if (DETAIL_ROUTES.has(leaf)) return null;
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
            <Pressable key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={t(meta.label)}
              onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }} style={{ flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 2 }}>
              <SF name={focused ? meta.on : meta.off} size={24} color={color} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[ty.caption2, { color, fontWeight: '500', fontSize: 10, lineHeight: 13 }]}>{t(meta.label)}</Text>
            </Pressable>
          );
        })}
      </View>
    </BlurView>
  );
}
