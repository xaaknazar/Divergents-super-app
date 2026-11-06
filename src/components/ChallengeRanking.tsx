// Рейтинг челленджа как в Apple Sports: крупная шапка с логотипом и капсулой
// сезона, ниже одна карточка «Рейтинг» с переключателем «Команды | Участники».
// Период («Весь челлендж | Сегодня») выбирается над карточкой — экран.
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, radius } from '../theme/tokens';
import { Logo } from './Logo';
import { SF } from './SFIcon';
import { Segmented } from './Segmented';
import { StandingsTable, StandingRow } from './StandingsTable';
import { tr } from '../state/LanguageContext';
import { fmtDecimal } from '../data/format';
import { hSelect } from '../lib/haptics';
import type { MemberTaskProgress } from '../data/community';
import { useColorWash, WashSurface } from './ColorWash';
import { GlassSurface } from './GlassSurface';

export type RankingTab = 'teams' | 'members';

/** Фирменные цвета знака Divergents (public/logo.svg) — не меняются с темой. */
const BRAND_LOGO = { body: '#234088', head: '#2F60DA' };

/**
 * Знак Divergents на белой плашке, как значок приложения. Центр — оптический:
 * у знака голова слева вверху, а тяжёлое тело справа, поэтому по рамке он
 * выглядит сдвинутым вправо-вверх. Сдвиг возвращает «вес» знака в центр плашки.
 */
export function LogoTile({ size = 44 }: { size?: number }) {
  const mark = Math.round(size * 0.74);
  return (
    <View testID="ranking-logo" style={{ width: size, height: size, borderRadius: Math.round(size * 0.27), borderCurve: 'continuous', backgroundColor: '#FFFFFF',
      alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
      <View style={{ transform: [{ translateX: -size * 0.05 }, { translateY: size * 0.02 }] }}>
        <Logo size={mark} body={BRAND_LOGO.body} head={BRAND_LOGO.head} />
      </View>
    </View>
  );
}
export type RankingPeriod = 'overall' | 'today';

export function ChallengeRankingHeader({ title = 'Divergents Challenge', season }: { title?: string; season?: number | null }) {
  const { T, ty, isDark } = useTheme();
  const wash = useColorWash();
  // На цветном фоне шапка белая, как в Apple Sports; без фона — цветом текста.
  const ink = wash ? '#FFFFFF' : T.label;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 18 }}>
      <View accessible accessibilityRole="header" accessibilityLabel={title}
        style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', columnGap: 10 }}>
        {/* Логотип всегда в фирменных цветах — на белой плашке, как значок
            приложения: так он виден на любом фоне и в любой теме. */}
        <LogoTile size={44} />
        <Text style={[ty.title1, { color: ink, flexShrink: 1 }]} numberOfLines={2}>{title}</Text>
      </View>
      {season ? (
        <View testID="ranking-season" accessible accessibilityLabel={`${tr('Сезон')} ${season}`}>
          <GlassSurface variant={wash ? 'clear' : 'regular'} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill }}>
            <Text style={[ty.headline, { color: wash || isDark ? '#FFFFFF' : T.label }]} numberOfLines={1}>{tr('Сезон')} {season}</Text>
          </GlassSurface>
        </View>
      ) : null}
    </View>
  );
}

/** Карточка «Рейтинг» как в Apple Sports: заголовок, подпись, переключатель и таблица. */
export function RankingCard({ caption, tabs, value, onChange, children }: {
  caption?: string; tabs: string[]; value: number; onChange?: (index: number) => void; children: React.ReactNode;
}) {
  const { T, ty } = useTheme();
  return (
    <WashSurface testID="ranking-card" radius={radius.block}><View style={{ paddingTop: 16, paddingBottom: 8 }}>
      <Text accessibilityRole="header" style={[ty.headline, { color: T.label, textAlign: 'center' }]}>{tr('Рейтинг')}</Text>
      {caption ? <Text style={[ty.caption1, { color: T.labelSecondary, textAlign: 'center', marginTop: 2, paddingHorizontal: 16 }]}>{caption}</Text> : null}
      <View style={{ paddingHorizontal: 12, paddingTop: 14 }}>
        <Segmented items={tabs} value={value} onChange={onChange} />
      </View>
      {children}
    </View></WashSurface>
  );
}

/** Маленький переключатель-капсулы внутри карточки, например «Все | Моя команда». */
export function PillToggle({ items, value, onChange, label }: { items: string[]; value: number; onChange: (index: number) => void; label: string }) {
  const { T, ty, isDark } = useTheme();
  const ink = isDark ? '#FFFFFF' : T.label;
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', justifyContent: 'center', columnGap: 8, paddingTop: 8 }}>
      {items.map((item, i) => {
        const on = i === value;
        return (
          <Pressable key={item} onPress={() => { hSelect(); onChange(i); }} accessibilityRole="radio" accessibilityLabel={item}
            accessibilityState={{ checked: on, selected: on }}
            style={({ pressed }) => ({ minHeight: minTouch, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
            {/* Выбранный пункт — стеклянная капсула, остальные — просто текст, как в iOS 26. */}
            {on ? <GlassSurface interactive style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill }}>
              <Text style={[ty.subheadEm, { color: ink }]}>{item}</Text>
            </GlassSurface> : <View style={{ paddingHorizontal: 14, paddingVertical: 7 }}>
              <Text style={[ty.subhead, { color: ink }]}>{item}</Text>
            </View>}
          </Pressable>
        );
      })}
    </View>
  );
}

const GOAL_ICON: Record<string, string> = { reading: 'book.fill', sugar: 'cube.fill', steps: 'figure.walk' };

function goalKind(t: MemberTaskProgress): 'reading' | 'sugar' | 'steps' | 'other' {
  const text = `${t.title} ${t.unit ?? ''}`;
  if (/сахар/i.test(text)) return 'sugar';
  if (/чтен|книг|стр/i.test(text)) return 'reading';
  if (/актив|шаг/i.test(text)) return 'steps';
  return 'other';
}

/** Подпись цели для VoiceOver: «Чтение 24 из 20 выполнено». */
export function goalLabel(t: MemberTaskProgress): string {
  const kind = goalKind(t);
  const name = kind === 'sugar' ? tr('Без сахара') : kind === 'reading' ? tr('Чтение') : kind === 'steps' ? tr('Активность') : t.title;
  const value = t.kind === 'metric' ? `${t.value} ${tr('из')} ${t.target ?? 0}` : '';
  const state = t.completed ? tr('выполнено') : t.marked ? tr('не выполнено') : tr('не отмечено');
  return [name, value, state].filter(Boolean).join(' ');
}

/** Цели дня значками: зелёный — выполнено, красный — отмечено и не выполнено, серый — ещё не отмечено. */
export function TodayGoals({ tasks }: { tasks: MemberTaskProgress[] }) {
  const { T, ty } = useTheme();
  if (!tasks.length) return null;
  return (
    <View testID="today-goals" accessible accessibilityLabel={tasks.map(goalLabel).join(', ')} style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 6, marginTop: 4 }}>
      {tasks.map((t) => {
        const color = t.completed ? T.greenText : t.marked ? T.redText : T.labelTertiary;
        const kind = goalKind(t);
        const value = t.kind === 'binary'
          ? (t.completed ? '✓' : t.marked ? '✗' : '–')
          : kind === 'steps' && t.value >= 1000 ? `${fmtDecimal(Math.floor(t.value / 100) / 10)}${tr('к')}` : String(t.value);
        return (
          <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', columnGap: 3 }}>
            <SF name={GOAL_ICON[kind] ?? t.icon} size={11} color={color} />
            <Text style={[ty.footnoteEm, { color, fontVariant: ['tabular-nums'] }]}>{value}</Text>
          </View>
        );
      })}
    </View>
  );
}

export interface ChallengeRankingCardProps {
  tab: RankingTab;
  onTab?: (tab: RankingTab) => void;
  rows: StandingRow[];
  period: RankingPeriod;
  /** Под заголовком: «День 9 из 21 · изменения со вчера». */
  caption?: string;
  /** Фильтр над таблицей участников («Все | Моя команда»). */
  filter?: React.ReactNode;
  /** Пустой список — текст вместо таблицы. */
  emptyText?: string;
}

const TABS: RankingTab[] = ['teams', 'members'];

export function ChallengeRankingCard({ tab, onTab, rows, period, caption, filter, emptyText }: ChallengeRankingCardProps) {
  const { T, ty } = useTheme();
  const today = period === 'today';
  return (
    <RankingCard caption={caption} tabs={[tr('Команды'), tr('Участники')]} value={TABS.indexOf(tab)} onChange={onTab ? (i) => onTab(TABS[i]) : undefined}>
      {filter}
      {rows.length ? (
        <StandingsTable
          nameColumn={tab === 'teams' ? tr('Команда') : today ? tr('Участник · цели дня') : tr('Участник')}
          rows={rows} showMove={!today} valueColumn={today ? tr('Сегодня') : tr('Очки')} />
      ) : (
        <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center', paddingVertical: 32, paddingHorizontal: 24 }]}>
          {emptyText ?? tr('Рейтинг ещё пуст')}
        </Text>
      )}
    </RankingCard>
  );
}
