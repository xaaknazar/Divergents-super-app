// «Открыт набор» и чужие идущие челленджи: СТАРЫЙ дизайн по решению владельца
// (handoff 2026-10-20, §5) — синяя шапка и белая часть. От нового: мягкая тень
// блока-ссылки (TappableSurface) и тонкая линия над нижней строкой.
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet,Text,View } from 'react-native';
import { ChallengeListItem,daysUntil,teamsNeed } from '../data/community';
import * as pl from '../data/plural';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { StatusBadge } from './StatusBadge';
import { TappableSurface } from './TappableSurface';
import { Wrapper } from './Wrapper';
const HERO_TEXT_SHADOW = { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 } as const;

export function CommunityChallengeCard({ ch, onPress }: { ch: ChallengeListItem; onPress: () => void }) {
  const { T, ty } = useTheme();
  const started = ch.status === 'active';
  const left = daysUntil(ch.startISO);
  // All team spots taken → recruitment done, waiting for the start.
  const full = !started && ch.teamList.length > 0 && teamsNeed(ch.teamList) === 0;
  const countdown = started ? tr('Челлендж идёт') : left > 0
    ? `${tr('Старт через')} ${pl.days(left)}${ch.startLabel ? ` · ${ch.startLabel}` : ''}`
    : tr('Старт скоро');
  return (
    <Wrapper marginHorizontal={16} marginBottom={16}><TappableSurface onPress={onPress} accessibilityLabel={`${ch.title}. ${countdown}`}
      accessibilityHint={started ? tr('Посмотреть команды, участников и рейтинг челленджа') : undefined}>
      <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16 }}>
        {/* Darkening overlay → guarantees white text contrast across the gradient */}
        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0.04)']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 52, height: 52, borderRadius: 15, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
            <SF name={ch.icon} size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: '#fff' }, HERO_TEXT_SHADOW]} numberOfLines={2}>{ch.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <SF name={started ? 'flame.fill' : 'calendar'} size={11} color="#fff" />
              <Text style={[ty.caption1, { color: '#fff', flex: 1 }, HERO_TEXT_SHADOW]} numberOfLines={1}>{countdown}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
      <View style={{ padding: 14 }}>
        {ch.subtitle ? <Text style={[ty.subhead, { color: T.labelSecondary, marginBottom: 10 }]} numberOfLines={2}>{ch.subtitle}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <StatusBadge label={String((tr('Онлайн')))} tone="success" icon="globe" />
          <StatusBadge label={String((pl.days(ch.durationDays)))} tone="brand" icon="flame.fill" />
          <StatusBadge label={String((pl.applications(ch.participants)))} tone="neutral" icon="person.3.fill" />
          <StatusBadge label={`${ch.maxFlags} ${tr('вылет')}`} tone="danger" icon="flag.fill" />
        </View>
        <View style={[styles.footer, { borderTopColor: T.separator }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            {started
              ? <SF name="trophy.fill" size={12} color={T.labelSecondary} />
              : full ? <SF name="checkmark.seal.fill" size={12} color={T.green} /> : <View style={{ width: 7, height: 7, borderRadius: 4, borderCurve: 'continuous', backgroundColor: T.green }} />}
            <Text style={[ty.caption1, { color: full ? T.green : T.labelSecondary, flexShrink: 1 }]} numberOfLines={1}>{started ? tr('Рейтинги доступны для просмотра') : full ? tr('Команды сформированы · ждём старта') : tr('Набор открыт')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[ty.subheadEm, { color: T.brandText }]} numberOfLines={1}>{tr('Подробнее')}</Text>
            <SF name="chevron.forward" size={12} color={T.brandText} />
          </View>
        </View>
      </View>
    </TappableSurface></Wrapper>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
