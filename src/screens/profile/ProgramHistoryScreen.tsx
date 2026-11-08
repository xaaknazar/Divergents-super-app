import React, { useMemo } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileStackParams } from '../../navigation/types';
import { useFitness } from '../../state/FitnessContext';
import { useLocalDay } from '../../state/useLocalDay';
import { programHistory } from '../../data/programResults';
import { NavHeader } from '../../components/NavHeader';
import { ScrollHeaderLayout } from '../../components/ScrollHeaderLayout';
import { ContentLoading } from '../../components/ContentLoading';
import { ProgramHistoryList } from '../../components/ProgramHistoryList';
import { hTap } from '../../lib/haptics';

export function ProgramHistoryScreen({ navigation }: NativeStackScreenProps<ProfileStackParams, 'ProgramHistory'>) {
  const { programs, loaded } = useFitness();
  const today = useLocalDay();
  const rows = useMemo(() => programHistory(programs), [programs, today]);
  const header = <NavHeader title="История программ" onBack={() => navigation.goBack()} />;
  if (!loaded) return <ScrollHeaderLayout header={header}>{() => <ContentLoading label="Загружаем историю программ" />}</ScrollHeaderLayout>;
  return <ProgramHistoryList header={header} rows={rows} onPrograms={() => navigation.navigate('MyFitness')}
    onOpen={id => { hTap(); navigation.navigate('ProgramResult', { programId: id }); }} />;
}
