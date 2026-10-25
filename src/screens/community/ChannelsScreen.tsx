// Все каналы отдельной страницей (из «Сообщества» → «Все»): свои с новым — сверху.
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { CommunityChannels } from '../../components/CommunityChannels';
import { DetailScreen } from '../../components/DetailScreen';
import { PageHeading } from '../../components/PageHeading';
import { Wrapper } from '../../components/Wrapper';
import { CommunityStackParams } from '../../navigation/types';
import { useChannel } from '../../state/ChannelContext';
import { tr } from '../../state/LanguageContext';

type Props = NativeStackScreenProps<CommunityStackParams, 'Channels'>;

export function ChannelsScreen({ navigation }: Props) {
  const { reload } = useChannel();
  return <DetailScreen backLabel={tr('Сообщество')} onBack={() => navigation.goBack()} onRefresh={reload}>
    <Wrapper paddingHorizontal={20} paddingTop={4} paddingBottom={18}>
      <PageHeading title={tr('Каналы')} description={tr('Статьи и голосовые от авторов сообщества. Подпишитесь, чтобы видеть новое первым.')} />
    </Wrapper>
    <CommunityChannels navigation={navigation} />
    <Wrapper paddingBottom={24} />
  </DetailScreen>;
}
