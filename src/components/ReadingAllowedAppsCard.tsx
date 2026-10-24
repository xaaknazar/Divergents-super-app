import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { ContentBlock } from './ContentBlock';
import { IconTile } from './IconTile';
import { Wrapper } from './Wrapper';
import { InlineNotice } from './InlineNotice';

export type ReadingAllowedAppsView = { count: number | null; editable: boolean; busy: boolean; needsReselection: boolean; error?: string; choose: () => void; retry?: () => void };
/** Настройка до чтения: какие читалки останутся доступны во время таймера. Одна строка статуса и одна кнопка. */
export function ReadingAllowedAppsCard({ value }: { value: ReadingAllowedAppsView }) {
  const { T, ty } = useTheme();
  const status = value.count === null ? value.busy ? 'Проверяем исключения…' : 'Список исключений пока не загружен.'
    : value.needsReselection ? 'Доступ Экранного времени изменился — выберите читалки заново.' : `Разрешено приложений: ${value.count}`;
  return <ContentBlock size="compact"><Wrapper gap={12}>
    <View style={styles.heading}>
      <IconTile icon="book.fill" tone="violet" variant="soft" size="sm" />
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>Приложения для чтения</Text>
        <Text accessibilityLiveRegion="polite" style={[ty.footnoteEm, { color: value.needsReselection ? T.orangeText : T.labelSecondary }]}>{status}</Text>
      </View>
    </View>
    {value.error ? <InlineNotice message={value.error} onRetry={value.retry} /> : null}
    <Button label={value.count ? 'Настроить разрешённые приложения' : 'Выбрать читалки'} variant="tinted"
      onPress={value.choose} disabled={!value.editable} loading={value.busy} />
    <Text style={[ty.footnote, { color: T.labelSecondary }]}>{value.editable || value.count === null
      ? 'Яндекс.Книги, Books и другие читалки останутся доступны во время таймера. Выбирайте отдельные приложения, не категории и не сайты: iOS не позволяет нам проверить, что выбранное приложение — читалка.'
      : 'Для настройки разрешите Экранное время и сохраните незавершённый подход, если он есть. На паузе исключения не меняются.'}</Text>
  </Wrapper></ContentBlock>;
}
const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
});
