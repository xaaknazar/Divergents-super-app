import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { ContentBlock } from './ContentBlock';
import { Wrapper } from './Wrapper';
import { InlineNotice } from './InlineNotice';

export type ReadingAllowedAppsView = { count: number | null; editable: boolean; busy: boolean; needsReselection: boolean; error?: string; choose: () => void; retry?: () => void };
export function ReadingAllowedAppsCard({ value }: { value: ReadingAllowedAppsView }) {
  const { T, ty } = useTheme();
  return <ContentBlock><Wrapper gap={10}>
    <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>Приложения для чтения</Text>
    <Text style={[ty.subhead, { color: T.labelSecondary }]}>Разрешите Яндекс.Книги, Books или другие читалки. Они останутся доступны во время таймера; остальные ограничения сохранятся.</Text>
    <Text accessibilityLiveRegion="polite" style={[ty.footnoteEm, { color: T.label }]}>
      {value.count === null ? value.busy ? 'Проверяем исключения…' : 'Список исключений пока не загружен.'
        : value.needsReselection ? 'Доступ Экранного времени изменился — выберите читалки заново.' : `Разрешено приложений: ${value.count}`}
    </Text>
    {value.error ? <InlineNotice message={value.error} onRetry={value.retry} /> : null}
    <Button label={value.count ? 'Настроить разрешённые приложения' : 'Выбрать читалки'} variant="tinted" icon="book.fill"
      onPress={value.choose} disabled={!value.editable} loading={value.busy} />
    <Text style={[ty.footnote, { color: T.labelSecondary }]}>{value.editable || value.count === null
      ? 'Выбирайте только отдельные приложения для книг, не категории и не сайты. iOS не позволяет нам проверить, что выбранное приложение — читалка.'
      : 'Для настройки разрешите Экранное время и сохраните незавершённый подход, если он есть. На паузе исключения не меняются.'}</Text>
  </Wrapper></ContentBlock>;
}
