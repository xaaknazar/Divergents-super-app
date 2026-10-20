import React from 'react';
import { Text, View } from 'react-native';
import { ShelfStatus } from '../data/books';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { ContentBlock } from './ContentBlock';
import { ProgressBar } from './ProgressBar';
import { Segmented } from './Segmented';
import { Wrapper } from './Wrapper';

const statuses: ShelfStatus[] = ['want', 'reading', 'read'];
export function BookShelfControls({ status, progress, busy, onSelect, onRemove }: {
  status?: ShelfStatus; progress: number; busy: boolean;
  onSelect: (status: ShelfStatus, progress?: number) => void; onRemove: () => void;
}) {
  const { T, ty } = useTheme();
  return <ContentBlock size="compact"><View style={{ gap: 14 }}>
    <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>Мой статус</Text>
    <Segmented items={['В планах', 'Читаю', 'Прочитано']} leadingIcons={['bookmark.fill', 'book.fill', 'checkmark.circle.fill']}
      value={status ? statuses.indexOf(status) : -1} onChange={busy ? undefined : index => { if (statuses[index] !== status) onSelect(statuses[index]); }} />
    {status === 'reading' ? <View style={{ gap: 10 }}>
      <Text style={[ty.subheadEm, { color: T.label }]}>Прогресс · {progress}%</Text>
      <ProgressBar value={progress / 100} accessibilityLabel="Прогресс чтения" />
      <Wrapper dir="row" wrap gap={8}>
        {[0, 25, 50, 75, 100].map(value => <Wrapper key={value} grow={1} basis={64}>
          <Button label={`${value}%`} variant="outline" size="compact" selected={value === progress} disabled={busy} onPress={() => onSelect('reading', value)} />
        </Wrapper>)}
      </Wrapper>
    </View> : null}
    {status ? <Button label="Убрать с полки" icon="trash" tone="danger" variant="plain" size="compact" disabled={busy} onPress={onRemove} /> : null}
  </View></ContentBlock>;
}
