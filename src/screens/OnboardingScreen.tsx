import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { View, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF, SFName } from '../components/SFIcon';
import { PrimaryButton, ty } from '../components/ui';
import { useAppFlow } from '../state/AppFlowContext';
import { useLang } from '../state/LanguageContext';
import { RootStackParams } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParams, 'Onboarding'>;

const STEPS: { icon: SFName; accent: SFName; tKey: 'ob1' | 'ob2' | 'ob3' | 'ob4' }[] = [
  { icon: 'brain.head.profile', accent: 'target', tKey: 'ob1' },
  { icon: 'sparkles', accent: 'crown.fill', tKey: 'ob2' },
  { icon: 'person.3.fill', accent: 'flame.fill', tKey: 'ob3' },
  { icon: 'briefcase.fill', accent: 'target', tKey: 'ob4' },
];

export function OnboardingScreen({ navigation }: Props) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const { completeOnboarding } = useAppFlow();
  const { t, lang } = useLang();
  const finish = () => { completeOnboarding(); };

  return (
    <View style={{ flex: 1, backgroundColor: T.systemBg, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 30, paddingHorizontal: 28 }}>
      {/* Dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 7, paddingVertical: 8, paddingBottom: 30 }}>
        {STEPS.map((_, i) => (
          <View key={i} style={{ width: i === step ? 22 : 6, height: 6, borderRadius: 3, backgroundColor: i === step ? T.brand : T.fillSecondary }} />
        ))}
      </View>

      {/* Illustration */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 240, height: 240, borderRadius: 60, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', top: 20, left: 30, width: 40, height: 40, borderRadius: 20, backgroundColor: T.brandAccent }} />
          <View style={{ position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 16, backgroundColor: T.orange, alignItems: 'center', justifyContent: 'center' }}>
            <SF name={s.accent} size={32} color="#fff" />
          </View>
          <SF name={s.icon} size={110} color={T.brand} />
        </View>
      </View>

      {/* Text */}
      <View style={{ alignItems: 'center', paddingVertical: 20, paddingBottom: 30 }}>
        <Text style={[ty.title1, { color: T.label, textAlign: 'center' }]}>{t(`${s.tKey}_t` as any)}</Text>
        <Text style={[ty.body, { color: T.labelSecondary, marginTop: 12, textAlign: 'center' }]}>{t(`${s.tKey}_b` as any)}</Text>
      </View>

      {/* Buttons */}
      <View style={{ gap: 10 }}>
        <PrimaryButton label={last ? t('start') : t('next')} onPress={() => (last ? finish() : setStep((v) => v + 1))} />
        {last ? null : <PrimaryButton label={lang === 'ru' ? 'Пропустить' : 'Skip'} color="transparent" onPress={finish} />}
      </View>
    </View>
  );
}
