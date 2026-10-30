import React from 'react';
import { Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import { Button } from './Button';
import { useTheme } from '../theme/ThemeContext';
import type { PurchasePhase } from '../state/CoursePurchasesContext';
import { safeSpaces } from '../data/format';

export function CoursePurchasePanel({ priceLabel, phase, message, testMode = false, onBuy, onRetry }:
  { priceLabel?: string; phase: PurchasePhase; message: string | null; testMode?: boolean;
    onBuy: () => void; onRetry: () => void }) {
  const { T, ty, textScale = 1 } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || textScale * fontScale > 1.15;
  const busy = ['purchasing', 'confirming', 'restoring', 'loading'].includes(phase);
  if (!priceLabel && !message && phase !== 'pending') return null;
  return <View style={styles.panel} accessibilityLiveRegion="polite">
    {priceLabel ? <>
      <View style={[styles.summary, stacked && styles.stacked]}>
        <Text style={[ty.subhead, { color: T.labelSecondary }]}>Разовая покупка</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}
          style={[ty.title2, styles.price, { color: T.label }]}>{safeSpaces(priceLabel)}</Text>
      </View>
      <Button size="large" label={phase === 'confirming' ? 'Открываем доступ…' : phase === 'pending' ? 'Ожидаем подтверждения' : 'Купить курс'}
        accessibilityHint={`Полный доступ к курсу. Цена ${safeSpaces(priceLabel)}. Без подписки.`}
        loading={busy} disabled={phase === 'pending'} onPress={onBuy} />
      <Text style={[ty.footnote, styles.caption, { color: T.labelSecondary }]}>
        {testMode ? 'Тестовая покупка · без списания денег' : 'Оплата через App Store · без подписки'}
      </Text>
    </> : null}
    {message ? <Text style={[ty.footnote, styles.caption, { color: phase === 'error' ? T.redText : T.labelSecondary }]}>{message}</Text> : null}
    {phase === 'pending' ? <Button variant="plain" size="compact" label="Проверить оплату"
      disabled={busy} onPress={onRetry} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  panel: { gap: 10 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  price: { flexShrink: 1 },
  caption: { textAlign: 'center' },
});
