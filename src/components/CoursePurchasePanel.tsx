import React from 'react';
import { Text, View } from 'react-native';
import { Button } from './Button';
import { useTheme } from '../theme/ThemeContext';
import type { PurchasePhase } from '../state/CoursePurchasesContext';

export function CoursePurchasePanel({ priceLabel, phase, message, canRestore, testMode = false, onBuy, onRestore }:
  { priceLabel?: string; phase: PurchasePhase; message: string | null; canRestore: boolean; testMode?: boolean;
    onBuy: () => void; onRestore: () => void }) {
  const { T, ty } = useTheme();
  const busy = ['purchasing', 'confirming', 'restoring', 'loading'].includes(phase);
  return <View style={{ gap: 8 }} accessibilityLiveRegion="polite">
    {testMode && priceLabel ? <Text style={[ty.footnote, { color: T.labelSecondary }]}>Тестовая покупка в TestFlight — деньги не списываются.</Text> : null}
    {priceLabel ? <Button label={phase === 'confirming' ? 'Открываем доступ…' : `Купить курс · ${priceLabel}`}
      loading={busy} disabled={phase === 'pending'} onPress={onBuy} /> : null}
    {message ? <Text style={[ty.footnote, { color: phase === 'error' ? T.redText : T.labelSecondary }]}>{message}</Text> : null}
    {canRestore ? <Button variant="plain" size="compact" label={phase === 'pending' ? 'Проверить покупку' : 'Восстановить покупки'}
      loading={phase === 'restoring'} disabled={busy} onPress={onRestore} /> : null}
  </View>;
}
