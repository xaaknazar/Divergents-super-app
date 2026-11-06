import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import type { ChannelRequest } from '../data/api';
import { Wrapper } from './Wrapper';
import { ContentBlock } from './ContentBlock';

export function ChannelRequestsSheet({ requests, onClose, onApprove, onReject }: { requests: ChannelRequest[]; onClose: () => void; onApprove: (id: string) => void; onReject: (id: string) => void }) {
const { T, ty } = useTheme(); const insets = useSafeAreaInsets();
return <>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => onClose()} />
        <View style={{ backgroundColor: T.systemBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderCurve: 'continuous', paddingBottom: insets.bottom + 16, maxHeight: '75%' }}>
          <View style={{ alignItems: 'center', paddingVertical: 10 }}><View style={{ width: 36, height: 5, borderRadius: 3, borderCurve: 'continuous', backgroundColor: T.fillSecondary }} /></View>
          <Text style={[ty.title3, { color: T.label, paddingHorizontal: 20, paddingBottom: 10 }]}>Запросы на вступление</Text>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            {requests.length === 0 ? <Text style={[ty.subhead, { color: T.labelTertiary, paddingHorizontal: 4, paddingVertical: 10 }]}>Новых запросов нет.</Text> : requests.map((r) => (
              <Wrapper marginBottom={10} key={r.id}><ContentBlock size="compact">
                <Text style={[ty.subheadEm, { color: T.label }]}>{r.profile?.fullName || r.userName || r.userEmail}</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary }]}>{r.userEmail}{r.profile?.phone ? ` · ${r.profile.phone}` : ''}{r.profile?.mbtiType ? ` · MBTI ${r.profile.mbtiType}` : ''}</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Принять заявку" onPress={() => onApprove(r.userId)} style={{ flex: 1, minHeight: 48, borderRadius: 12, borderCurve: 'continuous', backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.footnoteEm, { color: T.onBrand }]}>Принять</Text></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Отклонить заявку" onPress={() => onReject(r.userId)} style={{ flex: 1, minHeight: 48, borderRadius: 12, borderCurve: 'continuous', backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.footnoteEm, { color: T.label }]}>Отклонить</Text></Pressable>
                </View>
              </ContentBlock></Wrapper>
            ))}
          </ScrollView>
        </View>
</>;
}
