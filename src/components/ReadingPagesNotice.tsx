import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { SF } from './SFIcon';
import { Button } from './Button';

/** One actionable reminder, not a success receipt. Styles belong to this component. */
export function ReadingPagesNotice({ state, onRecord, busy = false }: {
  state: 'goal' | 'required'; onRecord?: () => void; busy?: boolean;
}) {
  const { T, ty } = useTheme();
  return <View style={[styles.card, { backgroundColor: T.brandTinted }]}>
    <View style={styles.heading} accessibilityLiveRegion="polite">
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <SF name="book.fill" size={20} color={T.brandText} />
      </View>
      <Text accessibilityRole="header" style={[ty.headline, styles.title, { color: T.label }]}>
        {state === 'goal' ? 'Час прочитан. Запишите страницы' : 'Осталось записать страницы'}
      </Text>
    </View>
    <Text style={[ty.subhead, { color: T.labelSecondary }]}>{state === 'goal'
      ? 'Таймер считает дополнительное время. Закончили — поставьте паузу и сохраните страницы.'
      : 'Сохраните страницы этого подхода — после этого можно начать новый. В статистику они попадут после ответа сервера.'}</Text>
    {onRecord ? <Button label="Записать страницы" icon="square.and.pencil" onPress={onRecord} disabled={busy}
      accessibilityHint="Поставить текущий подход на паузу и перейти к вводу прочитанных страниц" /> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { borderRadius: radius.block, borderCurve: 'continuous', paddingVertical: 14, paddingHorizontal: 16, gap: 8 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, minWidth: 0 },
});
