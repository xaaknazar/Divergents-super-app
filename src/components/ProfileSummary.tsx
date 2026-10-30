import React, { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { AwardBadge } from './AwardBadge';
import { ProgressRing } from './ProgressRing';
import { SF } from './SFIcon';
import { StatusBadge } from './StatusBadge';
export function ProfileSummary({ name, email, photoUrl, completeness, talent, award, onEdit }: {
 name: string; email?: string | null; photoUrl?: string | null; completeness: number; talent?: string; award?: boolean; onEdit: () => void;
}) {
 const { T, ty, textScale = 1 } = useTheme();
 const { fontScale } = useWindowDimensions();
 const largeText = fontScale * textScale > 1.3;
 const [broken, setBroken] = useState<string | null>(null);
 const initial = name.trim().charAt(0).toUpperCase() || 'D';
 return <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Редактировать анкету"
        style={{ borderRadius: 22, borderCurve: 'continuous', overflow: 'hidden', shadowColor: T.brand, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 }}>
        <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
          {/* Legibility scrim (same as PersonalizeScreen): white copy must stay
              readable when the user's accent is a pastel, esp. in dark theme. */}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0.06)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View style={{ flexDirection: largeText ? 'column' : 'row', alignItems: 'center', gap: 14 }}>
            {photoUrl && photoUrl !== broken ? (
              <Image source={{ uri: photoUrl }} onError={() => setBroken(photoUrl)} style={{ width: 64, height: 64, borderRadius: 18 }} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <View style={{ width: 64, height: 64, borderRadius: 18, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[ty.title1, { color: T.onBrand }]}>{initial}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              {/* Награда 🏆 за победу в челлендже — рядом со своим именем.
                  Её видит и сам человек: награда, которую видно только другим,
                  наградой не ощущается. */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[ty.title2, { color: T.onBrand, flexShrink: 1 }]}>{name}</Text>
                {award ? <AwardBadge size={18} /> : null}
              </View>
              <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 2 }]}>
                {email ?? 'Divergents'}
              </Text>
              {talent ? (
                <View style={{ marginTop: 8 }}>
                  <StatusBadge label={talent} tone="brand" variant="accentOverlay" icon="sparkles" />
                </View>
              ) : null}
            </View>
            <ProgressRing value={completeness / 100} size="compact" tone="inverse" label={`${completeness}%`} accessibilityLabel="Заполнение анкеты" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 14, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.22)' }}>
            <Text style={[ty.footnoteEm, { color: T.onBrand }]}>Редактировать анкету</Text>
            <SF name="chevron.right" size={12} color="rgba(255,255,255,0.9)" />
          </View>
        </LinearGradient>
      </Pressable>;
}
