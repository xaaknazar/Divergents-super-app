import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';

const SIZES = { small: 32, medium: 52, large: 88 } as const;

/** Аватар канала: картинка или первая буква на фирменном градиенте; у закрытого — замок. */
export function ChannelAvatar({ name, uri, size = 'medium', locked = false, ring = false }: {
  name: string; uri?: string | null; size?: keyof typeof SIZES; locked?: boolean;
  /** Обводка цветом карточки — когда аватар наезжает на обложку. */
  ring?: boolean;
}) {
  const { T, ty } = useTheme();
  const side = SIZES[size];
  const corner = Math.round(side * 0.3);
  const initial = (name.trim()[0] ?? 'К').toUpperCase();
  const letter = size === 'large' ? ty.largeTitle : size === 'medium' ? ty.title3 : ty.footnoteEm;
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[ring ? [styles.ring, { borderColor: T.cardBg, borderRadius: corner + 4 }] : null]}>
    {uri ? <Image source={{ uri }} style={{ width: side, height: side, borderRadius: corner, backgroundColor: T.brandTinted }}
      contentFit="cover" cachePolicy="memory-disk" />
      : <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.center, { width: side, height: side, borderRadius: corner }]}>
        <Text style={[letter, { color: T.onBrand }]}>{initial}</Text>
      </LinearGradient>}
    {locked && size !== 'small' ? <View style={[styles.lock, { backgroundColor: T.cardBg }]}>
      <View style={[styles.lockInner, { backgroundColor: T.labelSecondary }]}><SF name="lock.fill" size={9} color={T.cardBg} /></View>
    </View> : null}
  </View>;
}
const styles = StyleSheet.create({
  ring: { borderWidth: 4, borderCurve: 'continuous' },
  center: { alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  lock: { position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  lockInner: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
