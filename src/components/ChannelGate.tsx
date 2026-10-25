import React from 'react';
import { StyleSheet, View } from 'react-native';
import { count } from '../data/plural';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { EmptyState } from './EmptyState';

export type ChannelGateKind = 'locked' | 'requested' | 'empty' | 'empty-owner' | 'not-found';

/** Вместо ленты: закрытый канал, заявка на рассмотрении, пустой канал или канал не найден. */
export function ChannelGate({ kind, postCount = 0, onAction }: { kind: ChannelGateKind; postCount?: number; onAction?: () => void }) {
  const { T } = useTheme();
  const posts = postCount > 0 ? `${count(postCount, 'публикация', 'публикации', 'публикаций')} ждут вас внутри. ` : '';
  const content = {
    locked: { icon: 'lock.fill', title: 'Закрытый канал', subtitle: `${posts}Отправьте заявку — после одобрения автора публикации откроются здесь.` },
    requested: { icon: 'clock.fill', title: 'Заявка на рассмотрении', subtitle: `${posts}Автор канала увидит заявку и примет решение. Мы покажем публикации, как только доступ откроется.` },
    empty: { icon: 'quote.bubble.fill', title: 'Здесь пока тихо', subtitle: 'Автор ещё ничего не опубликовал. Новые публикации появятся в этой ленте.' },
    'empty-owner': { icon: 'square.and.pencil', title: 'Первая публикация', subtitle: 'Статья или голосовое — участники увидят их здесь и отметку о новом в «Сообществе».', action: 'Написать' },
    'not-found': { icon: 'tray', title: 'Канал не найден', subtitle: 'Возможно, он ещё публикуется или был удалён.', action: 'Обновить' },
  }[kind];
  return <View style={[styles.card, { backgroundColor: T.cardBg }]}>
    <EmptyState icon={content.icon} title={content.title} subtitle={content.subtitle}
      actionLabel={'action' in content ? content.action : undefined} onAction={onAction} />
  </View>;
}
const styles = StyleSheet.create({ card: { borderRadius: radius.block, borderCurve: 'continuous' } });
