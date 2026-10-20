import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { readingDateLabel } from '../data/readingCreation';
import { days } from '../data/plural';
import { radius } from '../theme/tokens';
import { ReadingHeaderStyle } from '../data/readingAppearance';
import { hexToRgba } from '../theme/personalization';
import { ReadingBookIllustration } from './ReadingBookIllustration';
import { Wrapper } from './Wrapper';

/** editorial — до вступления: книга сверху справа, title1. compact — у участника: одна строка
 * с книгой 108×72, чтобы таймер оставался на первом экране (handoff 2026-10-20 §6). */
export function ReadingChallengeHeader({ title, phase, day, durationDays, startDate, mode = 'scheduled', variant = 'editorial', teamName }: {
  title: string; phase: 'upcoming' | 'active' | 'finished'; day: number; durationDays: number; startDate: string; mode?: 'scheduled' | 'continuous';
  variant?: ReadingHeaderStyle; teamName?: string;
}) {
  const { T, ty, isDark, reduceTransparency } = useTheme();
  const progress = phase === 'finished' ? 1 : phase === 'upcoming' ? 0 : Math.max(0, Math.min(1, (day - 1) / Math.max(1, durationDays)));
  const paper = variant === 'editorial' || variant === 'compact';
  const branded = variant === 'cover';
  const centered = variant === 'focus' || variant === 'community';
  const horizontal = variant === 'split';
  const ink = branded ? T.onBrand : T.label;
  const accent = branded ? T.onBrand : T.brandText;
  const subtitle = phase === 'upcoming' ? `Старт ${readingDateLabel(startDate)} · ${mode === 'continuous' ? '60 минут в день' : days(durationDays)}`
    : phase === 'finished' ? 'Челлендж завершён · ваши результаты ниже'
      : mode === 'continuous' ? 'Читаем каждый день.' : `День ${day} из ${durationDays} · 60 минут для себя`;
  // Строка «60 минут в день» с часами — если подзаголовок её ещё не сказал.
  const meta = [subtitle.includes('60 минут') ? null : '60 минут в день', teamName ? `команда «${teamName}»` : null].filter(Boolean).join(' · ');
  const compactMeta = phase === 'active'
    ? [mode === 'scheduled' ? `День ${day} из ${durationDays}` : null, '60 минут в день', teamName ? `команда «${teamName}»` : null].filter(Boolean).join(' · ')
    : subtitle;
  const glass = variant === 'glass' && !reduceTransparency && Platform.OS === 'ios';
  return <View style={[styles.shell, { backgroundColor: branded ? T.brand : variant === 'minimal' || glass ? 'transparent' : T.cardBg,
    borderColor: T.cardBorder, borderWidth: !branded && variant !== 'minimal' ? paper ? 1 : 0.5 : 0 },
    variant === 'journal' && { borderLeftWidth: 4, borderLeftColor: T.brandText },
    variant === 'cover' && styles.cover, variant === 'minimal' && styles.minimal, variant === 'compact' && styles.compactShell]}>
    {glass ? <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <BlurView intensity={35} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(T.cardBg, 0.78) }]} />
    </View> : null}
    {variant === 'compact' ? <Wrapper dir="row" gap={12} align="center">
      <Wrapper flex={1} gap={4}>
        <Text style={[ty.subhead, { color: T.labelSecondary }]}>Reading challenge</Text>
        <Text accessibilityRole="header" style={[ty.title3, { color: T.label }]}>{title}</Text>
        <Wrapper dir="row" gap={6} align="center">
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name="clock" size={15} color={T.labelSecondary} /></View>
          <Text style={[ty.footnote, styles.flex, { color: T.labelSecondary }]}>{compactMeta}</Text>
        </Wrapper>
      </Wrapper>
      <ReadingBookIllustration placement="headerCompact" />
    </Wrapper> : paper ? <Wrapper gap={8}>
      <Wrapper align="flex-end" marginBottom={12}><ReadingBookIllustration placement="header" /></Wrapper>
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>Reading challenge</Text>
      <Text accessibilityRole="header" style={[ty.title1, { color: T.label }]}>{title}</Text>
      <Text style={[ty.body, { color: T.labelSecondary }]}>{subtitle}</Text>
      {meta && phase !== 'finished' ? <Wrapper dir="row" gap={6} align="center">
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name="clock" size={15} color={T.labelSecondary} /></View>
        <Text style={[ty.footnote, styles.flex, { color: T.labelSecondary }]}>{meta}</Text>
      </Wrapper> : null}
    </Wrapper> : <View style={[styles.content, horizontal && styles.horizontal, centered && styles.centered]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[
        styles.emblem, { backgroundColor: branded ? 'rgba(255,255,255,0.16)' : T.brandTinted },
        variant === 'split' && styles.largeEmblem, variant === 'cover' && styles.bookEmblem,
      ]}><SF name={variant === 'community' ? 'person.3.fill' : variant === 'focus' ? 'clock' : 'book.fill'} size={variant === 'split' ? 38 : 24} color={accent} /></View>
      <View style={[styles.copy, horizontal && styles.flex, centered && styles.centered]}>
        <Text style={[ty.footnoteEm, { color: accent }, centered && styles.centerText]}>Reading challenge</Text>
        {variant === 'focus' ? <Text style={[ty.largeTitle, styles.centerText, { color: T.brandText }]}>60 минут</Text> : null}
        <Text accessibilityRole="header" style={[ty.title2, { color: ink }, centered && styles.centerText]}>{title}</Text>
        {variant === 'ticket' ? <View style={[styles.perforation, { borderColor: T.separator }]} /> : null}
        <Text style={[ty.subhead, { color: branded ? T.onBrand : T.labelSecondary }, centered && styles.centerText]}>{subtitle}</Text>
        {mode === 'continuous' && phase === 'active' && variant !== 'focus' ? <Text style={[ty.footnote, { color: branded ? T.onBrand : T.labelSecondary }, centered && styles.centerText]}>60 минут в день</Text> : null}
      </View>
    </View>}
    {mode === 'scheduled' ? <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: durationDays, now: Math.round(progress * durationDays) }}
      accessibilityLabel="Завершённые дни челленджа" style={[styles.progress, { backgroundColor: branded ? 'rgba(255,255,255,0.2)' : T.brandTinted }]}>
      <View style={[styles.progress, { width: `${progress * 100}%`, backgroundColor: accent }]} />
    </View> : null}
  </View>;
}
const styles = StyleSheet.create({
  shell: { borderRadius: radius.block, borderCurve: 'continuous', padding: 22, gap: 18, overflow: 'hidden' },
  compactShell: { paddingVertical: 16, paddingLeft: 18, paddingRight: 16, gap: 14 },
  content: { gap: 16 }, copy: { gap: 9 }, horizontal: { flexDirection: 'row', alignItems: 'center' }, flex: { flex: 1 },
  centered: { alignItems: 'center' }, centerText: { textAlign: 'center' },
  emblem: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  largeEmblem: { width: 74, height: 94, borderRadius: 22 }, bookEmblem: { height: 66, borderRadius: 8 },
  cover: { borderTopLeftRadius: 8, borderBottomLeftRadius: 8, paddingLeft: 30 }, minimal: { paddingHorizontal: 4 },
  perforation: { borderTopWidth: 1, borderStyle: 'dashed', marginVertical: 6 },
  progress: { height: 5, borderRadius: 3, overflow: 'hidden' },
});
