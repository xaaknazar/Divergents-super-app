import React from 'react';
import { Text, View } from 'react-native';
import { Button } from './Button';
import { ListSection } from './ListSection';
import { useTheme } from '../theme/ThemeContext';
import type { PurchasePhase } from '../state/CoursePurchasesContext';

/** Explicit StoreKit restore belongs in account settings, not the course paywall. */
export function CoursePurchaseSettings({ phase, message, onRestore }: {
  phase: PurchasePhase; message: string | null; onRestore: () => void;
}) {
  const { T, ty } = useTheme();
  const busy = ['purchasing', 'confirming', 'restoring', 'loading'].includes(phase);
  return <ListSection header="Покупки курсов">
    <View style={{ padding: 16, gap: 12 }} accessibilityLiveRegion="polite">
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>Уже покупали курс? Верните доступ после смены телефона или переустановки. Повторной оплаты не будет.</Text>
      <Button variant="tinted" label="Восстановить доступ" icon="arrow.clockwise"
        accessibilityHint="Проверить покупки вашего Apple ID в этом аккаунте Divergents"
        loading={phase === 'restoring'} disabled={busy} onPress={onRestore} />
      {message ? <Text style={[ty.footnote, { color: phase === 'error' ? T.redText : T.labelSecondary }]}>{message}</Text> : null}
    </View>
  </ListSection>;
}
