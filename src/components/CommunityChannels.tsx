import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { CommunityStackParams } from '../navigation/types';
import { tr } from '../state/LanguageContext';
import { useChannelDirectory } from '../state/useChannelDirectory';
import { CommunityChannelList } from './CommunityChannelList';
import { CommunityChannelRow } from './CommunityChannelRow';
import { ContentEmptyState } from './ContentEmptyState';
import { ContentLoading } from './ContentLoading';
import { Wrapper } from './Wrapper';

type Nav = Pick<NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>['navigation'], 'navigate'>;
/** Все каналы: «Мои каналы» (с новым — сверху) и остальные. Используется во вкладке и на отдельном экране. */
export function CommunityChannels({ navigation }: { navigation: Nav }) {
  const { mine, others, all, loading, error, reload } = useChannelDirectory();
  const open = (id: string) => navigation.navigate('ServerChannel', { channelId: id });
  if (loading && all.length === 0) return <ContentLoading />;
  if (all.length === 0) return <ContentEmptyState error={error} onRetry={reload} icon="tray" title={tr('Пока ничего нет')} subtitle={tr('Каналы сообщества появятся здесь.')} />;
  const rows = (items: typeof all) => items.map(item => <CommunityChannelRow key={item.channel.id} channel={item.channel} joined={item.joined}
    unread={item.unread} latest={item.latest} onPress={() => open(item.channel.id)} />);
  return <Wrapper gap={24}>
    {mine.length ? <CommunityChannelList title={tr('Мои каналы')}>{rows(mine)}</CommunityChannelList> : null}
    {others.length ? <CommunityChannelList title={mine.length ? tr('Другие каналы') : tr('Каналы сообщества')}
      footer={tr('Открытые каналы можно читать сразу, в закрытые вступают по одобрению автора.')}>{rows(others)}</CommunityChannelList> : null}
  </Wrapper>;
}
