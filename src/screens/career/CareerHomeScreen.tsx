import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLang, tr } from '../../state/LanguageContext';
import { Screen } from '../../components/Screen';
import { NavBarLarge } from '../../components/headers';
import { CareerComingSoon } from '../../components/CareerComingSoon';
import { Wrapper } from '../../components/Wrapper';
import { CareerStackParams } from '../../navigation/types';
import { navigationRef } from '../../navigation/ref';
import { ProfileAvatarButton } from '../../components/ProfileAvatarButton';
import { useProfilePhoto } from '../../state/useProfilePhoto';

type Props = NativeStackScreenProps<CareerStackParams, 'CareerHome'>;

export function CareerHomeScreen(_props: Props) {
  const { t } = useLang();
  const photoUrl = useProfilePhoto();

  return (
    <Screen largeTitle={t('tab_career')}>
      <NavBarLarge title={t('tab_career')} trailing={(
        <ProfileAvatarButton photoUrl={photoUrl} onPress={() => (navigationRef as any).navigate('Tabs', { screen: 'ProfileTab' })} />
      )} />

      <Wrapper paddingHorizontal={16} paddingTop={24}>
        <CareerComingSoon badge={tr('Скоро')} title={tr('Раздел в разработке')}
          description={tr('Мы дорабатываем «Карьеру»: вакансии и подбор по вашим талантам. Раздел появится в одном из следующих обновлений приложения.')} />
      </Wrapper>
    </Screen>
  );
}
