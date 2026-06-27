// Gardner multiple-intelligences chart — vertical bars, one per intelligence
// type. Replicates the TalentsLab Gardner layout in the app's iOS design
// language: rounded-top coloured bars, % above each bar, emoji + short name
// below, light Y gridlines at 0/25/50/75/100. Horizontally scrollable when the
// bars don't fit the available width. Bars grow in subtly on mount (Animated).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Animated, LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ty, radius, space } from '../theme/tokens';

// ─── Type config ───────────────────────────────────────────────────
// Exported so screens can reuse the same colours / emoji / labels. `match`
// is a distinctive normalized substring used to map an app `category` to a
// type (after stripping " интеллект", case-insensitive).
export type GardnerTypeConfig = {
  name: string;
  short: string;
  color: string;
  emoji: string;
  match: string;
};

export const GARDNER_TYPES: Record<string, GardnerTypeConfig> = {
  linguistic:    { name: 'Лингвистический',          short: 'Лингвист.',   color: '#e06666', emoji: '㊗️', match: 'лингвист' },
  logical:       { name: 'Логико-математический',    short: 'Логико-мат.', color: '#ea9999', emoji: '🧠', match: 'математ' },
  musical:       { name: 'Музыкальный',              short: 'Музык.',      color: '#3c78d8', emoji: '🎶', match: 'музык' },
  kinesthetic:   { name: 'Телесно-кинестетический',  short: 'Кинестет.',   color: '#f6b26b', emoji: '✋', match: 'кинестет' },
  spatial:       { name: 'Пространственный',         short: 'Простр.',     color: '#38761d', emoji: '👁', match: 'пространств' },
  interpersonal: { name: 'Межличностный',            short: 'Межлич.',     color: '#073763', emoji: '👥', match: 'межличност' },
  intrapersonal: { name: 'Внутриличностный',         short: 'Внутрилич.',  color: '#a6bee7', emoji: '💭', match: 'внутриличност' },
  naturalist:    { name: 'Натуралистический',        short: 'Натурал.',    color: '#f1c232', emoji: '🌻', match: 'натуралист' },
  existential:   { name: 'Экзистенциальный',         short: 'Экзистенц.',  color: '#6d9eeb', emoji: '🙏', match: 'экзистенц' },
};

// Neutral fallback for categories that don't match any known type.
export const GARDNER_UNKNOWN: GardnerTypeConfig = {
  name: '', short: '', color: '#9AA0A6', emoji: '❓', match: '',
};

const normalize = (s: string) =>
  s.toLowerCase().replace(/ё/g, 'е').replace(/интеллект/g, '').replace(/\s+/g, ' ').trim();

// Match an app `category` to a Gardner type by normalized substring.
export function matchGardnerType(category: string): GardnerTypeConfig {
  const c = normalize(category || '');
  for (const key of Object.keys(GARDNER_TYPES)) {
    const t = GARDNER_TYPES[key];
    if (c.includes(t.match)) return t;
  }
  return { ...GARDNER_UNKNOWN, name: category, short: category };
}

// ─── Chart ─────────────────────────────────────────────────────────
const GRID_VALUES = [0, 25, 50, 75, 100];

export function GardnerChart({
  data, compact,
}: { data: { category: string; score: number }[]; compact?: boolean }) {
  const { T } = useTheme();
  const [plotW, setPlotW] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1, duration: 700, delay: 60, useNativeDriver: false,
    }).start();
  }, [data.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(
    () => data.map((d) => ({
      cfg: matchGardnerType(d.category),
      score: Math.max(0, Math.min(100, Math.round(d.score))),
    })),
    [data],
  );

  const PLOT_H = compact ? 96 : 132;
  const VALUE_H = 16;           // headroom reserved for the % above a full bar
  const MIN_BAR = 6;            // keep low scores visible
  const plotInner = PLOT_H - VALUE_H;
  const GUTTER = 22;            // left axis-labels column
  const minCol = compact ? 46 : 58;
  const n = items.length;

  const onLayout = (e: LayoutChangeEvent) => setPlotW(e.nativeEvent.layout.width);

  // Distribute width to fill when bars fit; otherwise use min width + scroll.
  const colW = plotW > 0 ? Math.max(minCol, plotW / Math.max(1, n)) : minCol;
  const contentW = colW * n;
  const needScroll = plotW > 0 && contentW > plotW + 0.5;
  const barW = Math.max(14, Math.round(colW * 0.46));

  const yFor = (v: number) => PLOT_H - (v / 100) * plotInner;

  const Empty = (
    <Text style={[ty.footnote, { color: T.labelSecondary, paddingVertical: 24, textAlign: 'center' }]}>
      Нет данных
    </Text>
  );

  const gridlines = (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: PLOT_H }}>
      {GRID_VALUES.map((v) => (
        <View key={v} style={{ position: 'absolute', left: 0, right: 0, top: yFor(v), height: 0.5, backgroundColor: T.separator }} />
      ))}
    </View>
  );

  const bars = (
    <View style={{ width: contentW }}>
      <View style={{ position: 'relative', height: PLOT_H }}>
        {gridlines}
        <View style={{ flexDirection: 'row', height: PLOT_H, alignItems: 'flex-end' }}>
          {items.map((it, i) => {
            const barH = MIN_BAR + (it.score / 100) * (plotInner - MIN_BAR);
            const h = progress.interpolate({ inputRange: [0, 1], outputRange: [0, barH] });
            return (
              <View key={i} style={{ width: colW, height: PLOT_H, alignItems: 'center', justifyContent: 'flex-end' }}>
                <Text style={[ty.caption2Em, { color: T.labelSecondary, marginBottom: 3 }]}>{it.score}</Text>
                <Animated.View style={{
                  width: barW, height: h,
                  borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm,
                  borderBottomLeftRadius: 2, borderBottomRightRadius: 2,
                  backgroundColor: it.cfg.color,
                }} />
              </View>
            );
          })}
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        {items.map((it, i) => (
          <View key={i} style={{ width: colW, alignItems: 'center', paddingHorizontal: 2 }}>
            <Text style={{ fontSize: compact ? 15 : 17, marginBottom: 2 }}>{it.cfg.emoji}</Text>
            <Text numberOfLines={1} style={[ty.caption2, { color: T.labelSecondary, textAlign: 'center' }]}>
              {it.cfg.short}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ backgroundColor: T.groupedBg, borderRadius: radius.xxl, padding: space.md }}>
      {n === 0 ? Empty : (
        <View style={{ flexDirection: 'row' }}>
          {/* Y axis labels — fixed while bars scroll */}
          <View style={{ width: GUTTER, height: PLOT_H }}>
            {GRID_VALUES.map((v) => (
              <Text key={v} style={[ty.caption2, {
                position: 'absolute', right: 4, top: yFor(v) - 7,
                color: T.labelTertiary, fontSize: 10,
              }]}>{v}</Text>
            ))}
          </View>
          <View style={{ flex: 1 }} onLayout={onLayout}>
            {needScroll ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {bars}
              </ScrollView>
            ) : bars}
          </View>
        </View>
      )}
    </View>
  );
}
