// Custom iOS-style tab bar (blur surface, brand active colour, SF icons).
import React from 'react';
import { View, Text, Pressable, useWindowDimensions, PixelRatio } from 'react-native';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { minTouch } from '../theme/tokens';
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
  // ProfileTab is intentionally absent: the profile is opened from the big
  // avatar button in each screen's header, which frees a slot so the five
  // remaining labels fit at full size.
};

// Compact fallbacks used only when the full word can't fit the tab slot
// (narrow screen or enlarged system/app text). Keeps the label readable at
// 11 pt instead of wrapping to «Сообществ / о» or shrinking to 9 pt.
const SHORT_RU: Record<string, string> = {
  CommunityTab: 'Клуб',
  LMSTab: 'Курсы',
  CareerTab: 'Работа',
};

// The bar is shown ONLY on the six tab-root screens; every pushed/detail screen
// is fullscreen (no bar). Inverting the rule this way means new detail screens
// are fullscreen automatically — no allow-list to keep in sync — which avoids
// the "half-screen page breaks the layout" bug. The tab CONTAINER names are
// included as a fail-safe so the bar stays visible before a nested stack has
// initialised (leaf falls back to the container name).
const ROOT_ROUTES = new Set([
  'LMSHome', 'AIChat', 'CommunityHome', 'MapHome', 'CareerHome', 'ProfileHome',
  'LMSTab', 'AITab', 'CommunityTab', 'MapTab', 'CareerTab', 'ProfileTab',
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
  const { T, isDark, reduceTransparency, ty } = useTheme();
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();
  const active = state.routes[state.index] as { name: string; state?: any };
  const leaf = focusedLeafName(active);
  if (!ROOT_ROUTES.has(leaf)) return null;

  // Labels must never wrap or shrink into unreadable 9 pt text. Estimate the
  // width the LONGEST label needs at the current font size (system Dynamic Type
  // included); when it doesn't fit the per-tab slot, fall back to icons-only —
  // the same thing iOS does at accessibility text sizes. Screen readers still
  // announce each tab via accessibilityLabel.
  const visible = state.routes.filter((r) => TABS[r.name]);
  const tabCount = Math.max(1, visible.length);
  const slotW = (width - 8) / tabCount - 6; // bar padding + per-tab padding
  const labelSize = ((ty.caption2 as { fontSize?: number }).fontSize ?? 11) * fontScale;
  // ~0.58em average glyph width for Gotham Rounded Cyrillic + a small buffer.
  const fits = (s: string) => s.length * labelSize * 0.58 + 4 <= slotW;
  // Per-tab: full label → short label → icon only. Never wrap, never shrink
  // below the readable 11 pt floor.
  const bestLabel = (key: string): string | null => {
    const full = t(TABS[key].label);
    if (fits(full)) return full;
    const short = SHORT_RU[key];
    if (short && fits(short)) return short;
    return null;
  };
  // All-or-nothing: if even one tab can't fit a readable label, drop labels
  // everywhere so the bar stays visually consistent (icons-only), rather than
  // a mix of words and bare icons.
  const showLabels = visible.every((r) => bestLabel(r.name) !== null);
  const labelFor = (key: string) => (showLabels ? bestLabel(key) : null);
  const anyLabel = showLabels;
  const iconSize = anyLabel ? 24 : 26;

  const barLayout = {
    position: 'absolute' as const, left: 0, right: 0, bottom: 0,
    paddingBottom: Math.max(insets.bottom, 10), paddingTop: 8,
    borderTopWidth: 0.5, borderTopColor: T.separator,
  };

  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 4 }}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = TABS[route.name];
        if (!meta) return null;
        const color = focused ? T.brandText : T.labelSecondary;
        const label = labelFor(route.name);
        return (
          <Pressable key={route.key}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={t(meta.label)}
            onPress={() => {
              hSelect();
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={({ pressed }) => ({ flex: 1, minHeight: minTouch, alignItems: 'center', justifyContent: 'center', gap: anyLabel ? 3 : 0, paddingHorizontal: 2, opacity: pressed ? 0.65 : 1 })}>
            <SF name={focused ? meta.on : meta.off} size={iconSize} color={color} />
            {label ? (
              <Text
                numberOfLines={1}
                ellipsizeMode="clip"
                allowFontScaling={false}
                style={[ty.caption2, { color, textAlign: 'center', fontSize: labelSize, lineHeight: Math.round(labelSize * 1.25) }]}
              >
                {label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );

  // Reduce Transparency: swap the frosted blur for an opaque surface.
  if (reduceTransparency) {
    return <View style={[barLayout, { backgroundColor: T.cardBg }]}>{content}</View>;
  }
  return (
    <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[barLayout, {
      backgroundColor: isDark ? 'rgba(18,22,33,0.86)' : 'rgba(249,249,249,0.80)',
    }]}>
      {content}
    </BlurView>
  );
}
