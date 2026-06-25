import React from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { BackNav } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { Capsule, PrimaryButton, Segmented, ty } from '../../components/ui';
import { Ring } from '../../components/talentUI';
import { ACCENTS, BACKGROUNDS } from '../../theme/personalization';
import { ProfileStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParams, 'Personalize'>;

export function PersonalizeScreen({ navigation }: Props) {
  const { T, scheme, mode, setMode, accent, setAccent, background, setBackground } = useTheme();
  useLang();

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back={tr('Профиль')} onBack={() => navigation.goBack()} />
      <Screen tabPadding={false} topInset={false} contentStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14 }}>
          <Text style={[ty.largeTitle, { color: T.label }]}>{tr('Персонализация')}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]}>{tr('Настройте тему, акцент и фон под себя')}</Text>
        </View>

        {/* Live preview */}
        <View style={{ marginHorizontal: 16, marginBottom: 22, borderRadius: 22, overflow: 'hidden', shadowColor: T.brand, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
          <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Ring value={0.72} size={62} color="#fff" label="72%" textColor="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={[ty.title3, { color: '#fff' }]}>{tr('Предпросмотр')}</Text>
                <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 2 }]}>{tr('Так выглядит ваша тема')}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                  <Capsule bg="rgba(255,255,255,0.22)" color="#fff"><SF name="sparkles" size={11} color="#fff" />Divergents</Capsule>
                </View>
              </View>
            </View>
          </LinearGradient>
          <View style={{ backgroundColor: T.cardBg, padding: 16, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton label={tr('Кнопка')} icon="checkmark" onPress={() => {}} style={{ height: 44 }} />
            </View>
            <View style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18, backgroundColor: T.brandTinted }}>
              <Text style={[ty.footnoteEm, { color: T.brand }]}>{tr('Чип')}</Text>
            </View>
          </View>
        </View>

        {/* Theme mode */}
        <Text style={[ty.footnoteEm, { color: T.labelSecondary, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 8 }]}>{tr('Тема')}</Text>
        <View style={{ paddingHorizontal: 16, marginBottom: 22 }}>
          <Segmented items={['Система', 'Светлая', 'Тёмная']} value={mode === 'system' ? 0 : mode === 'light' ? 1 : 2}
            onChange={(i) => setMode(i === 0 ? 'system' : i === 1 ? 'light' : 'dark')}
            leadingIcons={['gearshape.fill', 'sun.max.fill', 'moon.fill']} />
        </View>

        {/* Accent grid */}
        <Text style={[ty.footnoteEm, { color: T.labelSecondary, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 10 }]}>{tr('Акцентный цвет')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginBottom: 22 }}>
          {ACCENTS.map((a) => {
            const ac = scheme === 'dark' ? a.dark : a.light;
            const on = accent === a.key;
            return (
              <Pressable key={a.key} onPress={() => setAccent(a.key)} style={{ width: '25%', alignItems: 'center', paddingVertical: 10 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 2.5 : 0, borderColor: T.label }}>
                  <LinearGradient colors={[ac.brand, ac.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: on ? 46 : 52, height: on ? 46 : 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <SF name="checkmark" size={20} color="#fff" /> : null}
                  </LinearGradient>
                </View>
                <Text style={[ty.caption2, { color: on ? T.label : T.labelSecondary, marginTop: 6 }]} numberOfLines={1}>{a.name}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Background grid */}
        <Text style={[ty.footnoteEm, { color: T.labelSecondary, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 10 }]}>{tr('Фон')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginBottom: 24 }}>
          {BACKGROUNDS.map((b) => {
            const on = background === b.key;
            const acCur = ACCENTS.find((x) => x.key === accent) ?? ACCENTS[0];
            const ac = scheme === 'dark' ? acCur.dark : acCur.light;
            const cols = b.key === 'none' ? [T.secondaryBg, T.secondaryBg] : (b.colors ?? [ac.accent, ac.brand]);
            return (
              <Pressable key={b.key} onPress={() => setBackground(b.key)} style={{ width: '33.33%', padding: 6 }}>
                <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: on ? 2 : 0.5, borderColor: on ? T.brand : T.cardBorder }}>
                  <LinearGradient colors={cols as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 64, alignItems: 'center', justifyContent: 'center' }}>
                    {b.key === 'none' ? <SF name="circle" size={18} color={T.labelTertiary} /> : null}
                    {on ? <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}><SF name="checkmark" size={15} color="#111" /></View> : null}
                  </LinearGradient>
                </View>
                <Text style={[ty.caption2, { color: on ? T.label : T.labelSecondary, textAlign: 'center', marginTop: 5 }]}>{b.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[ty.caption1, { color: T.labelTertiary, textAlign: 'center', paddingHorizontal: 30 }]}>
          Настройки сохраняются на этом устройстве и применяются ко всему приложению.
        </Text>
      </Screen>
    </View>
  );
}
