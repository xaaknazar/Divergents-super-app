// Кнопка «Профиль» в шапке вкладки (handoff 2026-10-20, §2.2).
//
// Зона 52, лицо 42: фото или инициалы на градиенте бренда. Вокруг — кольцо
// заполненности анкеты (скрыто при 0 и 100 %), сверху — бейдж новых событий.
// Только представление; источники фото/анкеты/событий собирает useProfileButton.
// Компонент не требует авторизации и самостоятельно обрабатывает битое фото.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React,{ useState } from 'react';
import { Pressable,StyleSheet,Text,View } from 'react-native';
import Svg,{ Circle } from 'react-native-svg';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../theme/personalization';
import { FONT,shadow } from '../theme/tokens';
import { SF } from './SFIcon';

export interface ProfileAvatarButtonProps {
  photoUrl?: string | null;
  /** Имя для инициалов, когда фото нет. */
  name?: string | null;
  /** Заполненность анкеты, 0–100. Кольцо видно только между 0 и 100. */
  progress?: number;
  /** Число новых событий; > 9 показывается как «9+». */
  badge?: number;
  /** floating — стеклянный круг поверх карты. */
  variant?: 'plain' | 'floating';
  onPress?: () => void;
}

const BOX = 52;
const FACE = 42;
const RING_R = 24;
const RING_W = 2.5;

function initialsOf(name?: string | null) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

export function ProfileAvatarButton({ photoUrl, name, progress = 0, badge = 0, variant = 'plain', onPress }: ProfileAvatarButtonProps) {
  const { T, isDark, reduceMotion, reduceTransparency } = useTheme();
  // Ссылка на фото может протухнуть (файл удалили на сайте) — тогда молча
  // возвращаемся к инициалам, а не показываем пустой серый квадрат.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const showPhoto = !!photoUrl && photoUrl !== brokenUrl;
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const ring = pct > 0 && pct < 100;
  const initials = initialsOf(name);
  const circumference = 2 * Math.PI * RING_R;
  const label = tr('Профиль')
    + (ring ? `, анкета заполнена на ${pct}%` : '')
    + (badge > 0 ? `, новых: ${badge}` : '');
  const floating = variant === 'floating';

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      disabled={!onPress} accessibilityState={{ disabled: !onPress }}
      style={({ pressed }) => [styles.root, floating ? [{
        backgroundColor: reduceTransparency ? T.cardBg : hexToRgba(T.cardBg, isDark ? 0.84 : 0.72),
        borderColor: isDark ? T.separator : 'rgba(0,0,0,0.06)',
      }, styles.floating, shadow({ color: '#101D2C', opacity: 0.16, radius: 9, y: 6, elevation: 6 })] : null,
      { opacity: pressed ? 0.6 : 1 }]}>
      {ring ? <View pointerEvents="none" style={styles.ring}>
        <Svg width={BOX} height={BOX} viewBox={`0 0 ${BOX} ${BOX}`}>
          <Circle cx={BOX / 2} cy={BOX / 2} r={RING_R} fill="none" stroke={hexToRgba(T.brand, isDark ? 0.3 : 0.14)} strokeWidth={RING_W} />
          <Circle cx={BOX / 2} cy={BOX / 2} r={RING_R} fill="none" stroke={T.brandText} strokeWidth={RING_W}
            strokeLinecap="round" strokeDasharray={`${(circumference * pct) / 100} ${circumference}`}
            transform={`rotate(-90 ${BOX / 2} ${BOX / 2})`} />
        </Svg>
      </View> : null}
      <View style={[styles.faceShadow, shadow({ color: '#234088', opacity: 0.28, radius: 3, y: 2, elevation: 2 })]}>
        <View style={styles.face}>
          {showPhoto ? (
            <Image source={{ uri: photoUrl as string }} onError={() => setBrokenUrl(photoUrl ?? null)}
              style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={reduceMotion ? 0 : 120} />
          ) : <>
            <LinearGradient colors={['#3D5BDB', '#234088']} start={{ x: 0.18, y: 0.1 }} end={{ x: 0.82, y: 0.9 }} style={StyleSheet.absoluteFill} />
            {initials ? <Text allowFontScaling={false} style={styles.initials}>{initials}</Text>
              : <SF name="person.fill" size={20} color="#FFFFFF" />}
          </>}
          <View pointerEvents="none" style={styles.faceRim} />
        </View>
      </View>
      {badge > 0 ? <View pointerEvents="none" style={[styles.badge, { borderColor: floating || !isDark ? '#FFFFFF' : T.systemBg }]}>
        <Text allowFontScaling={false} style={styles.badgeText}>{badge > 9 ? '9+' : String(badge)}</Text>
      </View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: BOX, height: BOX, borderRadius: BOX / 2, alignItems: 'center', justifyContent: 'center' },
  floating: { borderWidth: 0.5 },
  ring: { position: 'absolute', top: 0, left: 0 },
  faceShadow: { width: FACE, height: FACE, borderRadius: FACE / 2 },
  face: { width: FACE, height: FACE, borderRadius: FACE / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  faceRim: { ...StyleSheet.absoluteFillObject, borderRadius: FACE / 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' },
  initials: { fontFamily: FONT.bold, fontSize: 17, lineHeight: 20, color: '#FFFFFF', letterSpacing: 0.3 },
  badge: { position: 'absolute', top: 1, right: 0, minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9,
    borderWidth: 2, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: FONT.bold, fontSize: 10, lineHeight: 12, color: '#FFFFFF' },
});
