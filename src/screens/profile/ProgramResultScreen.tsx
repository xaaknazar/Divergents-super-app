import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileStackParams } from '../../navigation/types';
import { useFitness } from '../../state/FitnessContext';
import { useLocalDay } from '../../state/useLocalDay';
import { programStats } from '../../data/fitness';
import { programShareCard } from '../../data/programResults';
import { ProgramResultContent } from '../../components/ProgramResult';
import { DetailScreen } from '../../components/DetailScreen';
import { ContentLoading } from '../../components/ContentLoading';
import { EmptyState } from '../../components/EmptyState';
import { Wrapper } from '../../components/Wrapper';
import { Button } from '../../components/Button';

export function ProgramResultScreen({ navigation, route }: NativeStackScreenProps<ProfileStackParams, 'ProgramResult'>) {
  const { programs, loaded } = useFitness();
  useLocalDay();
  const p = programs.find(program => program.id === route.params.programId);
  const s = p ? programStats(p) : null;
  return <DetailScreen title="Итоги программы" onBack={() => navigation.goBack()}>
    <Wrapper padding={16} gap={24}>
      {!loaded ? <ContentLoading label="Загружаем результат" /> : !p || !s?.finished ? <EmptyState
        title={p ? 'Программа ещё идёт' : 'Программа не найдена'}
        subtitle={p ? 'Итог появится после завершения программы.' : 'Возможно, её удалили или она сохранена на другом устройстве.'}
        actionLabel="К программам" onAction={() => navigation.navigate('MyFitness')} /> : <>
        <ProgramResultContent program={p} stats={s} />
        <Button label="Поделиться результатом" icon="square.and.arrow.up" onPress={() => navigation.navigate('WorkoutShare', { card: programShareCard(p, s) })} />
      </>}
    </Wrapper>
  </DetailScreen>;
}
