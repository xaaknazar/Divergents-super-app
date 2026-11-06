import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Wrapper } from '../../components/Wrapper';
import { NavHeader } from '../../components/NavHeader';
import { CommunityChannels } from '../../components/CommunityChannels';
import { useChannel } from '../../state/ChannelContext';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'Channels'>;
export function ChannelsScreen({ navigation }: Props) {
  const { reload } = useChannel();
  return <Screen topInset={false} tabPadding={false} aurora={false} onRefresh={reload}>
    <NavHeader title="Каналы" largeTitle backLabel="Сообщество" onBack={() => navigation.goBack()} />
    <Wrapper paddingBottom={24}><CommunityChannels navigation={navigation} /></Wrapper>
  </Screen>;
}
