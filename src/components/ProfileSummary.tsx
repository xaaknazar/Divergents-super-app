// Шапка профиля в духе «Аккаунта Apple» на iOS 26: крупный круглый аватар по центру,
// имя и почта под ним, стеклянная капсула «Редактировать анкету». Заполнение анкеты —
// кольцом вокруг аватара, как кольца активности: сразу видно, сколько осталось.
import React, { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { radius as R, minTouch } from '../theme/tokens';
import { SF } from './SFIcon';
import { StatusBadge } from './StatusBadge';
import { GlassSurface } from './GlassSurface';

const AVATAR = 92;
const RING = AVATAR + 16;

export function ProfileSummary({ name, email, photoUrl, completeness, talent, onEdit }: {
 name: string; email?: string | null; photoUrl?: string | null; completeness: number; talent?: string; onEdit: () => void;
}) {
  const { T, ty } = useTheme();
  const [broken, setBroken] = useState<string | null>(null);
  const initial = name.trim().charAt(0).toUpperCase() || 'D';
  const percent = Math.max(0, Math.min(100, Math.round(Number.isFinite(completeness) ? completeness : 0)));
  const r = RING / 2 - 2.5;
  const length = 2 * Math.PI * r;
  return <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 6, gap: 4 }}>
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Заполнение анкеты"
      accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent}%` }}
      style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
      <Svg width={RING} height={RING} style={{ position: 'absolute' }} accessible={false}>
        <Circle cx={RING / 2} cy={RING / 2} r={r} fill="none" stroke={T.fillTertiary} strokeWidth={4} />
        <Circle cx={RING / 2} cy={RING / 2} r={r} fill="none" stroke={T.brandText} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={`${length} ${length}`} strokeDashoffset={length * (1 - percent / 100)} rotation={-90} origin={`${RING / 2},${RING / 2}`} />
      </Svg>
      {photoUrl && photoUrl !== broken ? (
        <Image source={{ uri: photoUrl }} onError={() => setBroken(photoUrl)} style={{ width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 }} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <LinearGradient colors={[T.brandAccent, T.brand]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[ty.largeTitle, { color: T.onBrand }]}>{initial}</Text>
        </LinearGradient>
      )}
    </View>
    <Text accessibilityRole="header" style={[ty.title1, { color: T.label, textAlign: 'center', paddingHorizontal: 16 }]}>{name}</Text>
    <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center' }]}>{email ?? 'Divergents'}</Text>
    {talent ? <View style={{ marginTop: 6 }}><StatusBadge label={talent} tone="brand" icon="sparkles" /></View> : null}
    <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Редактировать анкету" accessibilityHint={`Анкета заполнена на ${percent}%`}
      style={({ pressed }) => ({ marginTop: 12, minHeight: minTouch, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <GlassSurface interactive style={{ minHeight: minTouch, borderRadius: R.pill, flexDirection: 'row', columnGap: 8, paddingHorizontal: 18 }}>
        <Text style={[ty.subheadEm, { color: T.label }]}>Редактировать анкету</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary, fontVariant: ['tabular-nums'] }]}>{percent}%</Text>
        <SF name="chevron.forward" size={12} color={T.labelSecondary} />
      </GlassSurface>
    </Pressable>
  </View>;
}
