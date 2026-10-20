import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { contrastForeground } from '../theme/personalization';
import { Screen } from './Screen';
import { NavHeader } from './NavHeader';
import { SF } from './SFIcon';
import { ProgressBar } from './ui';
import { AchievementBadgeTile as BadgeTile } from './AchievementBadgeTile';
export { AchievementBadgeTile as BadgeTile } from './AchievementBadgeTile';
import { ACHIEVEMENT_CATEGORIES, type AchievementCategory, type EarnedBadge } from '../data/achievementCatalog';

const TIERS = { 1: 'Бронза', 2: 'Серебро', 3: 'Золото' } as const;
const CATEGORIES = Object.entries(ACHIEVEMENT_CATEGORIES) as [AchievementCategory, typeof ACHIEVEMENT_CATEGORIES[AchievementCategory]][];
type Filter = 'all' | 'earned' | 'locked';

/** Native controls keep their label, state and 48-point target as text grows. */
function Action({ label, onPress, selected, expanded, disabled, primary = false, icon }: {
  label: string; onPress: () => void; selected?: boolean; expanded?: boolean; disabled?: boolean; primary?: boolean; icon?: string;
}) {
  const { T, ty } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ selected, expanded, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 12, paddingVertical: 12, gap: 8, borderRadius: 12,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: primary ? T.brand : selected ? T.brandTinted : T.fillQuaternary,
      opacity: disabled ? 0.5 : pressed ? 0.65 : 1 })}>
    <Text style={[ty.subhead, { color: primary ? contrastForeground(T.brand) : selected ? T.brandText : T.label, flexShrink: 1 }]}>{label}</Text>
    {icon ? <SF name={icon} size={16} color={primary ? contrastForeground(T.brand) : T.labelSecondary} /> : null}
  </Pressable>;
}

interface Props {
  badges: EarnedBadge[]; earned: number; total: number; ready: boolean; storageError: boolean;
  refresh: () => Promise<void>; onBack: () => void; onNavigate: (category: AchievementCategory) => void;
}

/** Presentational collection: no authentication, mutations or award calculation. */
export function AchievementCollection({ badges, earned, total, ready, storageError, refresh, onBack, onNavigate }: Props) {
  const { T, ty, textScale = 1 } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale, width } = useWindowDimensions();
  const [category, setCategory] = useState<AchievementCategory | 'all'>('all');
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const scale = fontScale * textScale;
  const contentWidth = Math.min(width - 32, 760);
  const columns = scale > 1.2 || contentWidth < 328 ? 1 : contentWidth >= 680 ? 3 : 2;
  const cellWidth = (contentWidth - (columns - 1) * 12) / columns;
  const categoryBadges = useMemo(() => badges.filter(b => category === 'all' || b.category === category), [badges, category]);
  const shown = useMemo(() => categoryBadges.filter(b => filter === 'all' || (filter === 'earned' ? b.earned : !b.earned)), [categoryBadges, filter]);
  const next = useMemo(() => [...categoryBadges].filter(b => !b.earned).sort((a, b) => b.progress - a.progress)[0], [categoryBadges]);
  const doRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true); setRefreshError(false);
    try { await refresh(); } catch { setRefreshError(true); } finally { setRefreshing(false); }
  };
  const selectCategory = (id: AchievementCategory | 'all') => { setCategory(id); setCategoriesOpen(false); setExpanded(null); };
  const filterOptions: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Все' },
    { value: 'earned', label: 'Полученные' },
    { value: 'locked', label: 'Впереди' },
  ];

  return <Screen scroll={false} topInset={false} aurora={false}>
    <NavHeader title="Достижения" backLabel="Профиль" hideBackLabel={scale > 1.2} onBack={onBack} />
    <FlatList testID="achievement-collection" key={columns} data={ready ? shown : []} numColumns={columns} keyExtractor={b => b.id}
      extraData={expanded} initialNumToRender={8} windowSize={5}
      style={{ width: '100%', alignSelf: 'center', maxWidth: 792 }}
      columnWrapperStyle={columns > 1 ? { gap: 12 } : undefined}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80, gap: 12 }}
      refreshing={refreshing} onRefresh={doRefresh}
      renderItem={({ item }) => <View testID={`achievement-cell-${item.id}`} style={{ width: cellWidth }}><BadgeTile b={item} expanded={expanded === item.id}
        onPress={() => setExpanded(id => id === item.id ? null : item.id)} onNavigate={() => onNavigate(item.category)} /></View>}
      ListHeaderComponent={<View style={{ paddingTop: 24, paddingBottom: 4, gap: 20 }}>
        <View style={{ gap: 8 }}>
          <Text accessibilityRole="header" style={[ty.title2, { color: T.label }]}>Твоя коллекция</Text>
          <Text style={[ty.body, { color: T.labelSecondary }]}>{ready ? `Получено ${earned} из ${total} достижений` : 'Загружаем сохранённые достижения'}</Text>
          {ready ? <ProgressBar value={total ? earned / total : 0} accessibilityLabel="Вся коллекция" /> : null}
        </View>
        {ready && next && filter !== 'earned' ? <View style={{ flexDirection: scale > 1.2 ? 'column' : 'row', gap: 12, alignItems: scale > 1.2 ? 'stretch' : 'center', paddingVertical: 4 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[ty.headline, { color: T.label }]}>{next.progress > 0 ? 'Ближайшая цель' : 'С чего начать'}</Text>
            <Text style={[ty.subhead, { color: T.labelSecondary }]}>{next.title} · {Math.min(next.value, next.goal)} из {next.goal}</Text>
          </View>
          <Action label="К цели" onPress={() => onNavigate(next.category)} icon="arrow.right" />
        </View> : null}
        {ready ? <>
          <View style={{ flexDirection: scale > 1.5 ? 'column' : 'row', gap: 8 }}>
            {filterOptions.map(option => <View key={option.value} style={{ flex: 1 }}><Action label={option.label} selected={filter === option.value}
              onPress={() => { setFilter(option.value); setExpanded(null); }} /></View>)}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Выбрать направление" accessibilityState={{ expanded: categoriesOpen }} onPress={() => setCategoriesOpen(v => !v)}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, opacity: pressed ? 0.65 : 1 })}>
            <View style={{ flex: 1, gap: 4 }}><Text style={[ty.headline, { color: T.label }]}>{category === 'all' ? 'Все направления' : ACHIEVEMENT_CATEGORIES[category].title}</Text>
              <Text accessibilityLiveRegion="polite" style={[ty.caption1, { color: T.labelSecondary }]}>Показано {shown.length} из {categoryBadges.length}</Text></View>
            <SF name={categoriesOpen ? 'xmark' : 'slider.horizontal.3'} size={20} color={T.brandText} />
          </Pressable>
          {categoriesOpen ? <View style={{ gap: 8 }}>
            <Action label="Все направления" selected={category === 'all'} onPress={() => selectCategory('all')} />
            {CATEGORIES.map(([id, meta]) => <Action key={id} label={meta.title} selected={category === id} onPress={() => selectCategory(id)} />)}
          </View> : null}
        </> : null}
        {(storageError || refreshError) ? <View accessibilityLiveRegion="polite" style={{ gap: 12 }}>
          <Text style={[ty.headline, { color: T.label }]}>Коллекцию не удалось загрузить</Text>
          <Text style={[ty.body, { color: T.labelSecondary }]}>Сохранённые достижения не изменены. Попробуй ещё раз.</Text>
          <Action label={refreshing ? 'Обновляем…' : 'Повторить загрузку'} onPress={doRefresh} disabled={refreshing} />
        </View> : null}
      </View>}
      ListEmptyComponent={!ready ? (storageError ? null : <View accessibilityLabel="Загрузка коллекции" accessibilityState={{ busy: true }} style={{ gap: 12 }}>
        <ActivityIndicator color={T.brandText} /><View style={{ minHeight: 160, borderRadius: 16, backgroundColor: T.fillQuaternary }} />
      </View>) : <View style={{ paddingVertical: 24, gap: 12 }}>
        <Text accessibilityRole="header" style={[ty.title3, { color: T.label }]}>{filter === 'earned' ? 'Здесь будут твои награды' : 'Все награды этого раздела собраны'}</Text>
        <Text style={[ty.body, { color: T.labelSecondary }]}>{filter === 'earned' ? 'Посмотри, что можно получить, и выбери ближайшую цель.' : 'Можно вернуться к коллекции или выбрать другое направление.'}</Text>
        <Action label={filter === 'earned' ? 'Посмотреть доступные' : 'Показать коллекцию'} onPress={() => setFilter('all')} />
      </View>}
      ListFooterComponent={<View style={{ paddingTop: 16, gap: 8 }}>
        <Text style={[ty.caption1, { color: T.labelSecondary }]}>Хранится на этом устройстве. При выходе из аккаунта коллекция очищается.</Text>
        <Action label="Как сохраняются достижения" expanded={storageOpen} onPress={() => setStorageOpen(v => !v)} icon="info.circle" />
        {storageOpen ? <Text style={[ty.body, { color: T.labelSecondary }]}>Подтверждённый сервером прогресс восстанавливается при загрузке. Материалы, отметки челленджа и новые действия на карте учитываются с этого обновления. Полный перенос коллекции между устройствами пока недоступен.</Text> : null}
      </View>}
    />
  </Screen>;
}
