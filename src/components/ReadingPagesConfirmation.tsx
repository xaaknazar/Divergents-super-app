import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { Wrapper } from './Wrapper';

/** A deliberate second step for a likely page-number typo, without rejecting fast readers. */
export function ReadingPagesConfirmation({ pages, minutes, onEdit, onConfirm, busy = false }: {
  pages: number; minutes?: number; onEdit: () => void; onConfirm: () => void; busy?: boolean;
}) {
  const { T, ty } = useTheme();
  return <Wrapper gap={12}>
    <View accessibilityLiveRegion="polite" style={styles.copy}>
      <Text accessibilityRole="header" style={[ty.title3, { color: T.label }]}>Проверьте количество</Text>
      <Text style={[ty.headline, { color: T.label }]}>{pages} страниц{minutes !== undefined ? ` за ${minutes} мин` : ''} — всё верно?</Text>
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>Нужно указать, сколько страниц вы прочитали, а не номер страницы, на которой остановились.</Text>
    </View>
    <Button label="Исправить число" onPress={onEdit} disabled={busy} />
    <Button label={`Да, сохранить ${pages} страниц`} variant="outline" onPress={onConfirm} loading={busy} />
  </Wrapper>;
}
const styles = StyleSheet.create({ copy: { gap: 8 } });
