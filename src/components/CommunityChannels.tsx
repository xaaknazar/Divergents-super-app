import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Text,View } from 'react-native';
import { CommunityStackParams } from '../navigation/types';
import { useChannel } from '../state/ChannelContext';
import { tr,useLang } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { CommunityChannelRow } from './CommunityChannelRow';
import { ContentEmptyState } from './ContentEmptyState';
import { ContentLoading } from './ContentLoading';

type Nav = NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>['navigation'];
export function CommunityChannels({ navigation }: { navigation: Nav }) {
  const { T, ty } = useTheme();
  const { t } = useLang();
  const { channels, loading, error, reload } = useChannel();
  return (
    <View>
      <Text style={[ty.footnote, { color: T.labelSecondary, marginHorizontal: 20, paddingBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 }]}>{t('channels_of_community')}</Text>
      {loading && channels.length === 0 ? <ContentLoading />
        : channels.length === 0 ? <ContentEmptyState error={error} onRetry={reload} icon="tray" title={tr('Пока ничего нет')} subtitle={tr('Каналы сообщества появятся здесь.')} />
        : channels.map((ch) => <CommunityChannelRow key={ch.id} channel={ch} navigation={navigation} />)}
    </View>
  );
}
