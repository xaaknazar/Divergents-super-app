import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { tr } from '../state/LanguageContext';
import { SF } from './SFIcon';

export type LearningShortcutProps = {
  onPress: () => void;
} & ({ kind: 'downloads'; count: number } | { kind: 'gift'; subtitle: string } | { kind: 'library' });

export function LearningShortcut(props: LearningShortcutProps) {
  const { T, ty } = useTheme();
  const offline = props.kind === 'downloads';
  const title = offline ? tr('Скачанные уроки') : props.kind === 'gift' ? 'Подарок новым участникам' : 'Библиотека книг';
  const subtitle = props.kind === 'downloads' ? `${props.count} · ${tr('доступны без интернета')}`
    : props.kind === 'gift' ? props.subtitle : 'Каталог, рецензии и ИИ-советник по книгам под ваш профиль';
  const icon = offline ? 'arrow.down.circle' : props.kind === 'gift' ? 'gift.fill' : 'book.fill';
  return <Pressable onPress={props.onPress} accessibilityRole="button"
    accessibilityLabel={props.kind === 'library' ? title : `${title}. ${subtitle}`}
    accessibilityHint={props.kind === 'library' ? 'Каталог, рецензии и ИИ-советник по книгам' : undefined}
    style={({ pressed }) => ({ borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden', opacity: pressed ? 0.7 : 1 })}>
    <LinearGradient colors={offline ? [T.brandTinted, T.brandTinted] : [T.brandTintedStrong, T.brandTinted]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ padding: offline ? 14 : 16, flexDirection: 'row', alignItems: 'center', gap: offline ? 12 : 14 }}>
      <View style={{ width: offline ? 42 : 46, height: offline ? 42 : 46, borderRadius: offline ? 12 : 13,
        borderCurve: 'continuous', backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
        <SF name={icon} size={offline ? 21 : 23} color={T.onBrand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[ty.headline, { color: T.label }]}>{title}</Text>
        <Text style={[ty.footnote, { color: T.labelSecondary, marginTop: 1 }]}>{subtitle}</Text>
      </View>
      <SF name="chevron.right" size={15} color={T.labelTertiary} />
    </LinearGradient>
  </Pressable>;
}
