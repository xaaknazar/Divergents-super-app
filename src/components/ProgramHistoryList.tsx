import React from 'react';
import { FlatList, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FitnessProgram, ProgramStats } from '../data/fitness';
import * as pl from '../data/plural';
import { PageHeading } from './PageHeading';
import { ProgramHistoryCard } from './ProgramHistoryCard';
import { EmptyState } from './EmptyState';
import { InlineNotice } from './InlineNotice';
import { ScrollHeaderLayout, scrollHeaderContentInset } from './ScrollHeaderLayout';
import { Wrapper } from './Wrapper';

export function ProgramHistoryList({ rows, onOpen, onPrograms, header }: {
  header?: React.ReactNode;
  rows: { p: FitnessProgram; s: ProgramStats }[]; onOpen: (id: string) => void; onPrograms: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const gutter = Math.max(16, (width - 680) / 2, insets.left, insets.right);
  const list = (headerHeight = 0) => <FlatList data={rows} keyExtractor={row => row.p.id} showsVerticalScrollIndicator={false}
    contentInsetAdjustmentBehavior="never" scrollIndicatorInsets={{ top: headerHeight }}
    contentContainerStyle={scrollHeaderContentInset(headerHeight, { paddingHorizontal: gutter, paddingTop: 16, paddingBottom: insets.bottom + 24, gap: 16 })}
    ListHeaderComponent={<Wrapper marginBottom={8}><PageHeading title={'Ваши усилия\nостаются с вами'}
      description="Завершённые программы, личные достижения и результаты, которыми хочется поделиться."
      summary={rows.length ? `${pl.count(rows.length, 'программа', 'программы', 'программ')} · ${pl.days(rows.reduce((n, row) => n + row.s.activeDays, 0))} с активностью в программах` : undefined} /></Wrapper>}
    ListEmptyComponent={<EmptyState icon="clock.arrow.circlepath" title="Здесь будет ваша история"
      subtitle="Завершите программу — её результаты появятся здесь автоматически. Все записи остаются на этом устройстве."
      actionLabel="К программам" onAction={onPrograms} />}
    renderItem={({ item }) => <ProgramHistoryCard program={item.p} stats={item.s} onPress={() => onOpen(item.p.id)} />}
    ListFooterComponent={rows.length ? <InlineNotice message="История хранится на этом устройстве. Удаление программы удаляет и её результат." /> : null} />;
  return header ? <ScrollHeaderLayout header={header}>{list}</ScrollHeaderLayout> : list();
}
