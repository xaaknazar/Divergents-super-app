import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommunityStackParams } from '../../navigation/types';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { EventAttendanceRoster } from '../../components/EventAttendanceRoster';
import { useEventAttendance } from '../../state/useEventAttendance';
export function EventAttendanceScreen({ route, navigation }: NativeStackScreenProps<CommunityStackParams, 'EventAttendance'>) {
  const state = useEventAttendance({ kind: route.params.kind, eventId: route.params.eventId });
  return <Screen scroll={false} topInset={false} tabPadding={false}><NavHeader title="Посещение" subtitle={route.params.title} largeTitle onBack={() => navigation.goBack()} />
    <EventAttendanceRoster participants={state.participants} loading={state.loading} error={state.error}
      onRefresh={state.refresh} onSave={state.save} />
  </Screen>;
}
