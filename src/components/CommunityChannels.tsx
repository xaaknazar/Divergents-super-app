import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { View } from 'react-native';
import { CommunityStackParams } from '../navigation/types';
import { useChannel } from '../state/ChannelContext';
import { CommunityChannelRow } from './CommunityChannelRow';
import { ContentEmptyState } from './ContentEmptyState';
import { ContentLoading } from './ContentLoading';
import { ChannelSearch } from './ChannelSearch';
import { Wrapper } from './Wrapper';

type Nav = Pick<NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>['navigation'], 'navigate'>;
export function CommunityChannels({ navigation }: { navigation: Nav }) {
  const { channels, loading, error, reload } = useChannel();
  const [query, setQuery] = useState('');
  const found = channels.filter(ch => `${ch.name} ${ch.bio ?? ''}`.toLocaleLowerCase('ru-RU').includes(query.trim().toLocaleLowerCase('ru-RU')));
  return <View>
    <Wrapper paddingHorizontal={16} paddingBottom={10}><ChannelSearch value={query} onChange={setQuery} placeholder="Поиск каналов" /></Wrapper>
    {loading && channels.length === 0 ? <ContentLoading />
      : channels.length === 0 ? <ContentEmptyState error={error} onRetry={reload} icon="tray" title="Пока ничего нет" subtitle="Каналы сообщества появятся здесь." />
      : found.length === 0 ? <ContentEmptyState error={false} icon="magnifyingglass" title="Канал не найден" subtitle="Попробуйте другое название." />
      : found.map(ch => <CommunityChannelRow key={ch.id} channel={ch} navigation={navigation} />)}
  </View>;
}
