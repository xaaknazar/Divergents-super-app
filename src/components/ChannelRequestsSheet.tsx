import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { MemberAvatar } from './MemberAvatar';
import { SheetModal } from './SheetModal';
import { Wrapper } from './Wrapper';

export type ChannelRequestView = { userId: string; name: string; detail?: string };

/** Заявки в закрытый канал: имя, почта и тип личности, «Принять» / «Отклонить». */
export function ChannelRequestsSheet({ visible, requests, busyId, onApprove, onReject, onClose }: {
  visible: boolean; requests: ChannelRequestView[]; busyId?: string | null;
  onApprove: (userId: string) => void; onReject: (userId: string) => void; onClose: () => void;
}) {
  const { T, ty } = useTheme();
  return <SheetModal visible={visible} title="Заявки на вступление" onClose={onClose}>
    {requests.length === 0 ? <EmptyState icon="person.2.fill" title="Новых заявок нет" subtitle="Когда кто-то попросит доступ к каналу, заявка появится здесь." />
      : requests.map(r => <View key={r.userId} style={[styles.card, { backgroundColor: T.cardBg }]}>
        <Wrapper dir="row" align="center" gap={12}>
          <MemberAvatar name={r.name} size={40} />
          <View style={styles.text}>
            <Text style={[ty.headline, { color: T.label }]} numberOfLines={2}>{r.name}</Text>
            {r.detail ? <Text style={[ty.footnote, { color: T.labelSecondary }]} numberOfLines={2}>{r.detail}</Text> : null}
          </View>
        </Wrapper>
        <Wrapper dir="row" gap={10}>
          <Wrapper flex={1}><Button label="Принять" size="compact" loading={busyId === r.userId} onPress={() => onApprove(r.userId)} /></Wrapper>
          <Wrapper flex={1}><Button label="Отклонить" size="compact" variant="tinted" tone="neutral" disabled={busyId === r.userId} onPress={() => onReject(r.userId)} /></Wrapper>
        </Wrapper>
      </View>)}
  </SheetModal>;
}
const styles = StyleSheet.create({
  card: { padding: 14, gap: 12, borderRadius: radius.block, borderCurve: 'continuous' },
  text: { flex: 1, minWidth: 0, gap: 2 },
});
