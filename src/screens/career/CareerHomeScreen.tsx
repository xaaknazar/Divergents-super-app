import React from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavBarLarge, HeaderIcon } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { Capsule, ty } from '../../components/ui';
import { useNotifications } from '../../state/NotificationsContext';
import { CareerStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CareerStackParams, 'CareerHome'>;

// Карьера временно закрыта: раздел (вакансии, подбор по талантам, отклики) на
// доработке и вернётся в одном из следующих обновлений. Экран-заглушка держит
// вкладку на месте и показывает понятное сообщение вместо пустого/сырого UI.
export function CareerHomeScreen({ navigation }: Props) {
  const { T } = useTheme();
  const { t } = useLang();
  const { unread } = useNotifications();

  return (
    <Screen largeTitle={t('tab_career')}>
      <NavBarLarge title={t('tab_career')} trailing={(
        <HeaderIcon name="bell.fill" color={T.brand} badge={unread} label="Уведомления" onPress={() => navigation.getParent()?.getParent()?.navigate('Notifications' as never)} />
      )} />

      <View style={{ alignItems: 'center', paddingHorizontal: 36, paddingTop: 48 }}>
        <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: T.brand, shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
          <SF name="gearshape.fill" size={46} color="#fff" />
        </LinearGradient>

        <Capsule bg={T.brandTinted} color={T.brand} style={{ marginTop: 18, alignSelf: 'center' }}><SF name="clock.fill" size={11} color={T.brand} />{tr('Скоро')}</Capsule>

        <Text style={[ty.title2, { color: T.label, marginTop: 14, textAlign: 'center' }]}>{tr('Раздел в разработке')}</Text>
        <Text style={[ty.body, { color: T.labelSecondary, marginTop: 10, textAlign: 'center', lineHeight: 22 }]}>
          {tr('Мы дорабатываем «Карьеру»: вакансии и подбор по вашим талантам. Раздел появится в одном из следующих обновлений приложения.')}
        </Text>
      </View>
    </Screen>
  );
}
