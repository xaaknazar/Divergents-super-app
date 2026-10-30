import React, { useMemo } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileStackParams } from '../../navigation/types';
import { useFitness } from '../../state/FitnessContext';
import { useLocalDay } from '../../state/useLocalDay';
import { programHistory } from '../../data/programResults';
import { DetailScreen } from '../../components/DetailScreen';
import { ContentLoading } from '../../components/ContentLoading';
import { ProgramHistoryList } from '../../components/ProgramHistoryList';
import { hTap } from '../../lib/haptics';

export function ProgramHistoryScreen({ navigation }: NativeStackScreenProps<ProfileStackParams, 'ProgramHistory'>) {
  const { programs, loaded } = useFitness();
  const today = useLocalDay();
  const rows = useMemo(() => programHistory(programs), [programs, today]);
  return <DetailScreen title="История программ" onBack={() => navigation.goBack()} scroll={false}>
    {!loaded ? <ContentLoading label="Загружаем историю программ" /> : <ProgramHistoryList rows={rows} onPrograms={() => navigation.navigate('MyFitness')}
      onOpen={id => { hTap(); navigation.navigate('ProgramResult', { programId: id }); }} />}
  </DetailScreen>;
}
