import { TabDock } from '../components/TabDock';
// Custom iOS-style tab bar (blur surface, brand active colour, SF icons).
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { MiniPlayer } from '../components/MiniPlayer';
import { SFName } from '../components/SFIcon';
import { hSelect } from '../lib/haptics';
import { useLang } from '../state/LanguageContext';
import { useRole } from '../state/useRole';

const TABS: Record<string, { label: 'tab_learn' | 'tab_ai' | 'tab_community' | 'tab_map' | 'tab_career' | 'tab_profile'; on: SFName; off: SFName }> = {
  LMSTab: { label: 'tab_learn', on: 'book.fill', off: 'book' },
  AITab: { label: 'tab_ai', on: 'sparkles', off: 'sparkles.outline' },
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

// Вкладка ↔ флаг показа из админ-панели сайта. «Обучение» и «Сообщество»
// скрыть нельзя — без них приложение остаётся без содержимого.
const TAB_FEATURE: Record<string, string> = {
  AITab: 'ai',
  MapTab: 'map',
  CareerTab: 'career',
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useLang();
  const { feature } = useRole();
  const active = state.routes[state.index] as { key: string; name: string; state?: any };
  if (!ROOT_ROUTES.has(focusedLeafName(active))) return null;
  const visible = state.routes.filter(route => TABS[route.name]
    && (!TAB_FEATURE[route.name] || feature(TAB_FEATURE[route.name]) || route.name === active.name));
  return <TabDock items={visible.map(route => {
    const meta = TABS[route.name];
    const selected = route.key === active.key;
    return { id: route.key, label: t(meta.label), shortLabel: SHORT_RU[route.name], icon: selected ? meta.on : meta.off, selected };
  })} onSelect={key => {
    const route = state.routes.find(r => r.key === key);
    if (!route) return;
    hSelect();
    const event = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
    if (route.key !== active.key && !event.defaultPrevented) navigation.navigate(route.name);
  }} onLongPress={key => { navigation.emit({ type: 'tabLongPress', target: key }); }}>
    <MiniPlayer />
  </TabDock>;
}
