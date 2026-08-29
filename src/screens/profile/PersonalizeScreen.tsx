import React, { useRef } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { SF, SFName } from '../../components/SFIcon';
import { Capsule, PrimaryButton, Segmented, ProgressBar, ty } from '../../components/ui';
import { Ring } from '../../components/talentUI';
import { ACCENTS, BACKGROUNDS, hexToRgba } from '../../theme/personalization';
import { TEXT_SIZES } from '../../theme/tokens';
import { hSelect, hSuccess } from '../../lib/haptics';
import { useTalentProfile } from '../../state/useTalentProfile';
import { useResume } from '../../state/useResume';
import { effectiveResumeCompleteness } from '../../data/talentslab';
import { useUser } from '@clerk/clerk-expo';
import { ProfileStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParams, 'Personalize'>;

// iOS inset-grouped card: leading tinted glyph, title, and the live current value
// on the right (Settings-style), with the control laid out beneath.
function Group({ icon, title, value, children }: { icon: SFName; title: string; value?: string; children: React.ReactNode }) {
  const { T } = useTheme();
  return (
    <View
      accessibilityRole="summary"
      style={{ marginHorizontal: 16, marginBottom: 14, backgroundColor: T.cardBg, borderRadius: 20, borderWidth: 0.5, borderColor: T.cardBorder, overflow: 'hidden' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 13, paddingBottom: 12 }}>
        <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
          <SF name={icon} size={15} color={T.brand} />
        </View>
        <Text style={[ty.subheadEm, { color: T.label, flexShrink: 1 }]} numberOfLines={1}>{title}</Text>
        <View style={{ flex: 1 }} />
        {value ? (
          <Text style={[ty.subhead, { color: T.labelSecondary, maxWidth: 150 }]} numberOfLines={1} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {value}
          </Text>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 12, paddingBottom: 14 }}>{children}</View>
    </View>
  );
}

// Background swatch that renders a faithful miniature of the real Aurora backdrop
// (soft off-corner glow blobs) instead of a flat gradient, so the preview matches
// what the user actually gets on-screen.
function BgSwatch({ colors, none, selected }: { colors: string[]; none?: boolean; selected?: boolean }) {
  const { T } = useTheme();
  const [c1, c2, c3] = colors;
  return (
    <View style={{ height: 60, backgroundColor: T.secondaryBg, alignItems: 'center', justifyContent: 'center' }}>
      {!none ? (
        <>
          <View style={{ position: 'absolute', top: -18, left: -14, width: 58, height: 58, borderRadius: 29, overflow: 'hidden' }}>
            <LinearGradient colors={[hexToRgba(c1, 0.95), hexToRgba(c1, 0)]} start={{ x: 0.35, y: 0.35 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          </View>
          <View style={{ position: 'absolute', bottom: -20, right: -16, width: 64, height: 64, borderRadius: 32, overflow: 'hidden' }}>
            <LinearGradient colors={[hexToRgba(c2, 0.9), hexToRgba(c2, 0)]} start={{ x: 0.6, y: 0.4 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
          </View>
          <LinearGradient colors={[hexToRgba(c3, 0.4), 'transparent']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
        </>
      ) : null}
      {none && !selected ? <SF name="circle" size={18} color={T.labelTertiary} /> : null}
      {selected ? (
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
          <SF name="checkmark" size={15} color="#111" />
        </View>
      ) : null}
    </View>
  );
}

export function PersonalizeScreen({ navigation }: Props) {
  const { T, scheme, mode, setMode, accent, setAccent, background, setBackground, textSize, setTextSize, reduceMotion } = useTheme();
  const { lang } = useLang();

  // Real user identity for a personal "this is YOUR theme" preview.
  const { profile, live } = useTalentProfile();
  const { completeness: localCompleteness } = useResume();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const name = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ')
    || (live && profile?.fullName ? profile.fullName : null)
    || (email ? email.split('@')[0] : 'Divergents');
  const initial = (name?.trim()?.[0] ?? 'D').toUpperCase();
  const completeness = effectiveResumeCompleteness(profile, localCompleteness);
  const photoUrl = profile?.photoUrl;

  // Gentle "pop" of the live preview whenever a choice changes. Respect the OS
  // "Reduce Motion" setting (iOS HIG): settle instantly instead of springing.
  const pop = useRef(new Animated.Value(1)).current;
  const animate = () => {
    if (reduceMotion) { pop.setValue(1); return; }
    pop.setValue(0.972);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 6, tension: 150 }).start();
  };
  // Swatches: own haptic + animate. Segmented already fires its own haptic, so
  // it only needs the preview animation (avoids a double tap).
  const pick = (fn: () => void) => { hSelect(); fn(); animate(); };
  const pickSeg = (fn: () => void) => { fn(); animate(); };

  const accObj = ACCENTS.find((x) => x.key === accent) ?? ACCENTS[0];
  const bgObj = BACKGROUNDS.find((b) => b.key === background) ?? BACKGROUNDS[0];
  const ac = scheme === 'dark' ? accObj.dark : accObj.light;
  const modeIndex = mode === 'system' ? 0 : mode === 'light' ? 1 : 2;
  const modeNames = [tr('Система'), tr('Светлая'), tr('Тёмная')];
  const textIndex = Math.max(0, TEXT_SIZES.findIndex((t) => t.key === textSize));

  // Reset-to-defaults affordance: lets users experiment freely and revert.
  const isDefault = mode === 'system' && accent === 'divergents' && background === 'none' && textSize === 'md';
  const resetAll = () => {
    hSuccess();
    setMode('system');
    setAccent('divergents');
    setBackground('none');
    setTextSize('md');
    animate();
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader
        backLabel={tr('Профиль')}
        onBack={() => navigation.goBack()}
        trailing={!isDefault ? (
          <Pressable
            onPress={resetAll}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={tr('Сбросить настройки')}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? 0.5 : 1 })}
          >
            <SF name="arrow.counterclockwise" size={14} color={T.brandAccent} />
            <Text style={[ty.body, { color: T.brandAccent }]}>{tr('Сбросить')}</Text>
          </Pressable>
        ) : undefined}
      />
      <Screen tabPadding={false} topInset={false} contentStyle={{ paddingBottom: 44 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 18 }}>
          <Text style={[ty.largeTitle, { color: T.label }]}>{tr('Персонализация')}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]}>{tr('Настройте тему, акцент и размер под себя')}</Text>
        </View>

        {/* Live preview — the user's own card, reflecting accent + appearance + text scale */}
        <Animated.View style={{ marginHorizontal: 16, marginBottom: 24, borderRadius: 24, overflow: 'hidden', transform: [{ scale: pop }], shadowColor: ac.brand, shadowOpacity: scheme === 'dark' ? 0.4 : 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 7 }}>
          <LinearGradient colors={[ac.brand, ac.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
            {/* Directional legibility scrim — darkens the text side so white copy
                stays readable even on light accents (amber/teal ~2–3:1 otherwise). */}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(0,0,0,0.24)', 'rgba(0,0,0,0.04)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={{ width: 54, height: 54, borderRadius: 16 }} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[ty.title2, { color: '#fff' }]}>{initial}</Text>
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[ty.title3, { color: '#fff', textShadowColor: 'rgba(0,0,0,0.22)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }]} numberOfLines={1}>{name}</Text>
                <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.95)', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.18)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }]} numberOfLines={1}>{tr('Так выглядит ваша тема')}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 9 }}>
                  <Capsule bg="rgba(255,255,255,0.22)" color="#fff"><SF name="sparkles" size={11} color="#fff" />{accObj.name}</Capsule>
                </View>
              </View>
              <Ring value={Math.max(0, Math.min(1, completeness / 100))} size={58} color="#fff" label={`${completeness}%`} textColor="#fff" />
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
        <Group icon="circle.lefthalf.filled" title={tr('Оформление')} value={modeNames[modeIndex]}>
          <View style={{ paddingHorizontal: 4 }}>
            <Segmented
              items={modeNames}
              value={modeIndex}
              onChange={(i) => pickSeg(() => setMode(i === 0 ? 'system' : i === 1 ? 'light' : 'dark'))}
              leadingIcons={['gearshape.fill', 'sun.max.fill', 'moon.fill']}
            />
          </View>
        </Group>

        {/* Accent palette */}
        <Group icon="paintpalette.fill" title={tr('Акцентный цвет')} value={accObj.name}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {ACCENTS.map((a) => {
              const sw = scheme === 'dark' ? a.dark : a.light;
              const on = accent === a.key;
              return (
                <Pressable
                  key={a.key}
                  onPress={() => pick(() => setAccent(a.key))}
                  style={{ width: '25%', alignItems: 'center', paddingVertical: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`${tr('Акцент')} ${a.name}`}
                  accessibilityState={{ selected: on }}
                >
                  <View style={{ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 2.5 : 0, borderColor: T.label }}>
                    <LinearGradient colors={[sw.brand, sw.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: on ? 44 : 50, height: on ? 44 : 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' }}>
                      {/* White disc + dark check: legible on every accent, incl. light
                          amber/teal where a bare white check fails WCAG (~2.2:1). */}
                      {on ? (
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' }}>
                          <SF name="checkmark" size={15} color="#111" />
                        </View>
                      ) : null}
                    </LinearGradient>
                  </View>
                  <Text style={[ty.caption2, { color: on ? T.label : T.labelSecondary, marginTop: 6 }]} numberOfLines={1}>{a.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </Group>

        {/* Text size */}
        <Group icon="textformat.size" title={tr('Размер текста')} value={tr(TEXT_SIZES[textIndex].name)}>
          <View style={{ paddingHorizontal: 4 }}>
            <Segmented
              items={TEXT_SIZES.map((t) => tr(t.name))}
              value={textIndex}
              onChange={(i) => pickSeg(() => setTextSize(TEXT_SIZES[i].key))}
            />
          </View>
          {/* Live sample — real sentence in the scaled body style, so the effect is
              concrete rather than an abstract "A a". */}
          <View
            style={{ marginTop: 14, paddingHorizontal: 8 }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={[ty.caption1, { color: T.labelTertiary, textTransform: 'uppercase', letterSpacing: 0.4 }]} numberOfLines={1}>{tr('Пример')}</Text>
            <Text style={[ty.body, { color: T.label, marginTop: 3 }]} numberOfLines={2}>{tr('Дизайн, который подстраивается под вас.')}</Text>
          </View>
        </Group>

        {/* Background glow */}
        <Group icon="sparkles" title={tr('Фон')} value={bgObj.name}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {BACKGROUNDS.map((b) => {
              const on = background === b.key;
              const cols = b.key === 'none' ? [] : (b.colors ?? [ac.accent, ac.brand, ac.accent]);
              return (
                <Pressable
                  key={b.key}
                  onPress={() => pick(() => setBackground(b.key))}
                  style={{ width: '33.33%', padding: 5 }}
                  accessibilityRole="button"
                  accessibilityLabel={`${tr('Фон')} ${b.name}`}
                  accessibilityState={{ selected: on }}
                >
                  <View style={{ borderRadius: 15, overflow: 'hidden', borderWidth: on ? 2 : 0.5, borderColor: on ? T.brand : T.cardBorder }}>
                    <BgSwatch colors={cols} none={b.key === 'none'} selected={on} />
                  </View>
                  <Text style={[ty.caption2, { color: on ? T.label : T.labelSecondary, textAlign: 'center', marginTop: 5 }]} numberOfLines={1}>{b.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </Group>

        <Text style={[ty.caption1, { color: T.labelTertiary, textAlign: 'center', paddingHorizontal: 30, marginTop: 8 }]}>
          {lang === 'ru'
            ? 'Настройки сохраняются на этом устройстве и применяются ко всему приложению.'
            : 'Settings are saved on this device and applied across the whole app.'}
        </Text>
      </Screen>
    </View>
  );
}
