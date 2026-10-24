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
  return <View style={[styles.card, { backgroundColor: T.cardBg, borderColor: T.brandText }]}>
    <View style={styles.heading} accessibilityLiveRegion="polite">
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <SF name="book.fill" size={24} color={T.brandText} />
      </View>
      <Text accessibilityRole="header" style={[ty.title3, styles.title, { color: T.label }]}>
        {state === 'goal' ? 'Час прочитан. Запишите страницы' : 'Осталось записать страницы'}
      </Text>
    </View>
    <Text style={[ty.body, { color: T.labelSecondary }]}>{state === 'goal'
      ? 'Таймер считает дополнительное время. Если закончили читать, поставьте его на паузу и сохраните страницы книги.'
      : 'Перед новым таймером сохраните страницы предыдущей книги. Они попадут в историю и рейтинг только после подтверждения сервера.'}</Text>
    {onRecord ? <Button label="Записать страницы" icon="square.and.pencil" size="large" onPress={onRecord} disabled={busy}
      accessibilityHint="Поставить текущий подход на паузу и перейти к вводу прочитанных страниц" /> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { borderRadius: radius.block, borderCurve: 'continuous', borderWidth: 1, padding: 18, gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, minWidth: 0 },
});
