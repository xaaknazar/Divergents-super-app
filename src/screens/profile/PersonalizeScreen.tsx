import React, { useRef } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { BackNav } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { Capsule, PrimaryButton, Segmented, ProgressBar, ty } from '../../components/ui';
import { Ring } from '../../components/talentUI';
import { ACCENTS, BACKGROUNDS } from '../../theme/personalization';
import { TEXT_SIZES } from '../../theme/tokens';
import { hSelect } from '../../lib/haptics';
import { ProfileStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParams, 'Personalize'>;

function SectionLabel({ children }: { children: string }) {
  const { T } = useTheme();
  return (
    <Text style={[ty.footnoteEm, { color: T.labelSecondary, textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: 20, marginBottom: 10 }]}>
      {children}
    </Text>
  );
}

export function PersonalizeScreen({ navigation }: Props) {
  const { T, scheme, mode, setMode, accent, setAccent, background, setBackground, textSize, setTextSize } = useTheme();
  const { lang } = useLang();

  // Gentle "pop" of the live preview whenever a choice changes.
  const pop = useRef(new Animated.Value(1)).current;
  const animate = () => {
    pop.setValue(0.972);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 6, tension: 150 }).start();
  };
  // Swatches: own haptic + animate. Segmented already fires its own haptic, so
  // it only needs the preview animation (avoids a double tap).
  const pick = (fn: () => void) => { hSelect(); fn(); animate(); };
  const pickSeg = (fn: () => void) => { fn(); animate(); };

  const accObj = ACCENTS.find((x) => x.key === accent) ?? ACCENTS[0];
  const ac = scheme === 'dark' ? accObj.dark : accObj.light;
  const modeIndex = mode === 'system' ? 0 : mode === 'light' ? 1 : 2;
  const textIndex = Math.max(0, TEXT_SIZES.findIndex((t) => t.key === textSize));

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back={tr('Профиль')} onBack={() => navigation.goBack()} />
      <Screen tabPadding={false} topInset={false} contentStyle={{ paddingBottom: 44 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 }}>
          <Text style={[ty.largeTitle, { color: T.label }]}>{tr('Персонализация')}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]}>{tr('Настройте тему, акцент и размер под себя')}</Text>
        </View>

        {/* Live preview — reflects accent, appearance and text size in real time */}
        <Animated.View style={{ marginHorizontal: 16, marginBottom: 26, borderRadius: 24, overflow: 'hidden', transform: [{ scale: pop }], shadowColor: ac.brand, shadowOpacity: scheme === 'dark' ? 0.4 : 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 7 }}>
          <LinearGradient colors={[ac.brand, ac.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Ring value={0.72} size={64} color="#fff" label="72%" textColor="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={[ty.title3, { color: '#fff' }]} numberOfLines={1}>{tr('Предпросмотр')}</Text>
                <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.92)', marginTop: 2 }]} numberOfLines={2}>{tr('Так выглядит ваша тема')}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 9 }}>
                  <Capsule bg="rgba(255,255,255,0.22)" color="#fff"><SF name="sparkles" size={11} color="#fff" />{accObj.name}</Capsule>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Surface block — reflects light/dark + accent tints + text scale */}
          <View style={{ backgroundColor: T.cardBg, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
                <SF name="paintpalette.fill" size={18} color={T.brand} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{tr('Пример текста')}</Text>
                <Text style={[ty.footnote, { color: T.labelSecondary }]} numberOfLines={1}>{tr('Размер меняется по всему приложению')}</Text>
              </View>
            </View>
            <ProgressBar value={0.72} color={T.brand} height={6} />
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton label={tr('Кнопка')} icon="checkmark" onPress={() => {}} style={{ height: 44 }} />
              </View>
              <View style={{ paddingVertical: 10, paddingHorizontal: 15, borderRadius: 18, backgroundColor: T.brandTinted }}>
                <Text style={[ty.footnoteEm, { color: T.brand }]}>{tr('Чип')}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Appearance */}
        <SectionLabel>{tr('Оформление')}</SectionLabel>
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <Segmented
            items={[tr('Система'), tr('Светлая'), tr('Тёмная')]}
            value={modeIndex}
            onChange={(i) => pickSeg(() => setMode(i === 0 ? 'system' : i === 1 ? 'light' : 'dark'))}
            leadingIcons={['gearshape.fill', 'sun.max.fill', 'moon.fill']}
          />
        </View>

        {/* Accent palette */}
        <SectionLabel>{tr('Акцентный цвет')}</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginBottom: 22 }}>
          {ACCENTS.map((a) => {
            const sw = scheme === 'dark' ? a.dark : a.light;
            const on = accent === a.key;
            return (
              <Pressable key={a.key} onPress={() => pick(() => setAccent(a.key))} style={{ width: '25%', alignItems: 'center', paddingVertical: 10 }} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 2.5 : 0, borderColor: T.label }}>
                  <LinearGradient colors={[sw.brand, sw.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: on ? 46 : 52, height: on ? 46 : 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <SF name="checkmark" size={20} color="#fff" /> : null}
                  </LinearGradient>
                </View>
                <Text style={[ty.caption2, { color: on ? T.label : T.labelSecondary, marginTop: 6 }]} numberOfLines={1}>{a.name}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Text size */}
        <SectionLabel>{tr('Размер текста')}</SectionLabel>
        <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
          <Segmented
            items={TEXT_SIZES.map((t) => tr(t.name))}
            value={textIndex}
            onChange={(i) => pickSeg(() => setTextSize(TEXT_SIZES[i].key))}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4, paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontFamily: ty.body.fontFamily, fontSize: 13, color: T.labelTertiary }}>A</Text>
          <Text style={{ fontFamily: ty.body.fontFamily, fontSize: 28, color: T.labelSecondary }}>A</Text>
          <Text style={[ty.footnote, { color: T.labelTertiary, marginLeft: 6, marginBottom: 3 }]}>{tr('Применяется ко всему приложению')}</Text>
        </View>

        {/* Background glow */}
        <SectionLabel>{tr('Фон')}</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginBottom: 26 }}>
          {BACKGROUNDS.map((b) => {
            const on = background === b.key;
            const cols = b.key === 'none' ? [T.secondaryBg, T.secondaryBg] : (b.colors ?? [ac.accent, ac.brand]);
            return (
              <Pressable key={b.key} onPress={() => pick(() => setBackground(b.key))} style={{ width: '33.33%', padding: 6 }} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: on ? 2 : 0.5, borderColor: on ? T.brand : T.cardBorder }}>
                  <LinearGradient colors={cols as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 64, alignItems: 'center', justifyContent: 'center' }}>
                    {b.key === 'none' && !on ? <SF name="circle" size={18} color={T.labelTertiary} /> : null}
                    {on ? <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}><SF name="checkmark" size={15} color="#111" /></View> : null}
                  </LinearGradient>
                </View>
                <Text style={[ty.caption2, { color: on ? T.label : T.labelSecondary, textAlign: 'center', marginTop: 5 }]} numberOfLines={1}>{b.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[ty.caption1, { color: T.labelTertiary, textAlign: 'center', paddingHorizontal: 30 }]}>
          {lang === 'ru'
            ? 'Настройки сохраняются на этом устройстве и применяются ко всему приложению.'
            : 'Settings are saved on this device and applied across the whole app.'}
        </Text>
      </Screen>
    </View>
  );
}
