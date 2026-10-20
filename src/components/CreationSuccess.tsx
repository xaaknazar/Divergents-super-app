import React,{ useEffect,useRef } from 'react';
import { AccessibilityInfo,ScrollView,StyleSheet,Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { CreationLocationPreview } from './CreationLocationPreview';
import { HeaderIcon } from './HeaderIcon';
import { SF } from './SFIcon';
import { ContentBlock } from './ContentBlock';
import { StatusBadge } from './StatusBadge';
import { Wrapper } from './Wrapper';
import { SuccessCelebration } from './SuccessCelebration';

export type CreationKind = 'challenge' | 'trip' | 'meetup' | 'sport' | 'channel';
const COPY = {
  challenge: { status: 'Челлендж создан', open: 'Открыть челлендж', collection: 'К челленджам' },
  trip: { status: 'Поездка создана', open: 'Открыть поездку', collection: 'К поездкам' },
  meetup: { status: 'Мероприятие создано', open: 'Открыть мероприятие', collection: 'К мероприятиям' },
  sport: { status: 'Спортивная встреча создана', open: 'Открыть встречу', collection: 'К спортивным встречам' },
  channel: { status: 'Канал создан', open: 'Открыть канал', collection: 'К каналам' },
} satisfies Record<CreationKind, { status: string; open: string; collection: string }>;

export interface CreationSuccessProps {
  kind: CreationKind;
  title: string;
  dateLabel?: string;
  locationLabel?: string;
  summary?: string;
  coordinate?: { latitude: number; longitude: number };
  destination: 'detail' | 'collection';
  onOpen: () => void;
  onClose: () => void;
  celebrate?: boolean;
}

/** Confirmed publication only; no fetches, navigation state or cosmetic overrides. */
export function CreationSuccess({ kind, title, dateLabel, locationLabel, summary, coordinate,
  destination, onOpen, onClose, celebrate = false }: CreationSuccessProps) {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const announced = useRef(false);
  const copy = COPY[kind];
  useEffect(() => {
    if (!announced.current) {
      AccessibilityInfo.announceForAccessibility(`${copy.status}. ${title}`);
      announced.current = true;
    }
  }, [copy.status, title]);
  const metadata = [
    { icon: 'calendar', value: dateLabel },
    { icon: 'mappin.and.ellipse', value: locationLabel },
    { icon: 'info.circle', value: summary },
  ].filter(row => !!row.value);
  const offline = kind === 'meetup' || kind === 'sport' || kind === 'trip';
  return <View testID="creation-success" style={[styles.surface, { backgroundColor: T.systemBg,
    paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
    <Wrapper align="center" grow={1} shrink={1}>
      <Wrapper width="100%" maxWidth={600} grow={1} shrink={1}>
        <Wrapper dir="row" justify="flex-end" paddingHorizontal={12}>
          <HeaderIcon name="xmark" label="Закрыть результат создания" onPress={onClose} />
        </Wrapper>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {celebrate ? <Wrapper align="center"><SuccessCelebration /></Wrapper> : null}
          <Wrapper align="flex-start" paddingTop={8} paddingBottom={16}>
            <StatusBadge tone="success" icon="checkmark.circle.fill" label={copy.status} />
          </Wrapper>
          <ContentBlock>
            <Wrapper gap={8} paddingBottom={20}>
              <Text accessibilityRole="header" style={[ty.title1, { color: T.label }]}>{title}</Text>
            </Wrapper>
            {metadata.length ? <View style={[styles.details, { borderTopColor: T.separator }]}>
              {metadata.map(row => <Wrapper key={row.icon} dir="row" gap={10} align="flex-start">
                <Wrapper paddingTop={2}><SF name={row.icon} size={18} color={T.labelSecondary} /></Wrapper>
                <Text style={[ty.subhead, styles.detailText, { color: T.labelSecondary }]}>{row.value}</Text>
              </Wrapper>)}
            </View> : null}
            {offline && coordinate && locationLabel ? <Wrapper marginTop={18}>
              <CreationLocationPreview coordinate={coordinate} location={locationLabel} />
            </Wrapper> : null}
          </ContentBlock>
        </ScrollView>
        <Wrapper paddingHorizontal={20} paddingTop={12} paddingBottom={12} gap={8}>
          <Button label={destination === 'detail' ? copy.open : copy.collection} onPress={onOpen} size="large" />
          <Button label="Готово" onPress={onClose} variant="plain" size="large" />
        </Wrapper>
      </Wrapper>
    </Wrapper>
  </View>;
}

const styles = StyleSheet.create({
  surface: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 },
  details: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 18, gap: 12 },
  detailText: { flex: 1 },
});
