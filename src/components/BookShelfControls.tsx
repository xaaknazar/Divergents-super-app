import React from 'react';
import { Text, View } from 'react-native';
import { ShelfStatus } from '../data/books';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { ContentBlock } from './ContentBlock';
import { ProgressBar } from './ProgressBar';
import { Segmented } from './Segmented';
import { BookProgressPicker } from './BookProgressPicker';

const statuses: ShelfStatus[] = ['want', 'reading', 'read'];
export function BookShelfControls({ status, progress, busy, onSelect, onRemove }: {
  status?: ShelfStatus; progress: number; busy: boolean;
  onSelect: (status: ShelfStatus, progress?: number) => void; onRemove: () => void;
}) {
  const { T, ty } = useTheme();
  return <ContentBlock><View style={{ gap: 16 }}>
    <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>Мой статус</Text>
    <Segmented items={['В планах', 'Читаю', 'Прочитано']}
      value={status ? statuses.indexOf(status) : -1} onChange={busy ? undefined : index => { if (statuses[index] !== status) onSelect(statuses[index]); }} />
    {status === 'reading' ? <View style={{ gap: 10 }}>
      <Text style={[ty.subheadEm, { color: T.label }]}>Прогресс · {progress}%</Text>
      <ProgressBar value={progress / 100} accessibilityLabel="Прогресс чтения" />
      <BookProgressPicker value={progress} disabled={busy} onChange={value => onSelect('reading', value)} />
    </View> : null}
    {status ? <Button label="Убрать с полки" icon="trash.fill" tone="danger" variant="plain" size="compact" disabled={busy} onPress={onRemove} /> : null}
  </View></ContentBlock>;
}
