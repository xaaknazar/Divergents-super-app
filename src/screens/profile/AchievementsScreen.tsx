import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AchievementCollection } from '../../components/AchievementCollection';
import { useAchievements, type AchievementCategory } from '../../data/achievements';
import { ProfileStackParams } from '../../navigation/types';
import { navigationRef } from '../../navigation/ref';

type Props = NativeStackScreenProps<ProfileStackParams, 'Achievements'>;

function goToCategory(category: AchievementCategory) {
  const target = category === 'books' ? { screen: 'LMSTab', params: { screen: 'Books', initial: false } }
    : category === 'learning' || category === 'materials' ? { screen: 'LMSTab', params: { screen: 'LMSHome', initial: false } }
    : category === 'map' ? { screen: 'MapTab', params: { screen: 'MapHome', initial: false } }
    : category === 'fitness' ? { screen: 'ProfileTab', params: { screen: 'MyFitness', initial: false } }
    : { screen: 'CommunityTab', params: { screen: 'CommunityHome', initial: false } };
  if (navigationRef.isReady()) navigationRef.navigate('Tabs', target);
}

export function AchievementsScreen({ navigation }: Props) {
  return <AchievementCollection {...useAchievements()} onBack={() => navigation.goBack()} onNavigate={goToCategory} />;
}
