import React from 'react';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tr } from '../state/LanguageContext';
import { nativeGlass } from './GlassSurface';
import { SF } from './SFIcon';

export interface MiniPlayerCardProps {
  title: string;
  courseTitle: string;
  kind: 'lesson' | 'download';
  playing: boolean;
  progress: number;
  onOpen: () => void;
  onToggle: () => void;
  onClose: () => void;
}

/** Tinted floating glass, like the compact primary action in the iOS photo picker. */
export function MiniPlayerCard({ title, courseTitle, kind, playing, progress, onOpen, onToggle, onClose }: MiniPlayerCardProps) {
  const { ty, reduceTransparency } = useTheme();
  const fraction = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  return <View style={styles.elevation}>
    <View style={styles.capsule}>
      <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        {reduceTransparency ? <View style={[StyleSheet.absoluteFill, styles.solid]} />
          : nativeGlass ? <GlassView testID="mini-player-glass" glassEffectStyle="regular" colorScheme="light"
            tintColor="rgba(0,104,204,0.88)" style={StyleSheet.absoluteFill} />
          : <>
            {Platform.OS === 'ios' ? <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFill} /> : null}
            <View style={[StyleSheet.absoluteFill, styles.tint]} />
            <LinearGradient colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']} style={StyleSheet.absoluteFill} />
          </>}
      </View>
      <View style={styles.row}>
        <Pressable onPress={onOpen} accessibilityRole="button"
          accessibilityLabel={`${tr('Сейчас играет')}: ${title}`}
          accessibilityHint={kind === 'lesson' ? tr('Открыть урок') : tr('Открыть загрузки')}
          style={({ pressed }) => [styles.source, pressed && styles.pressed]}>
          <View style={styles.sourceIcon}><SF name={kind === 'lesson' ? 'play.circle.fill' : 'headphones'} size={22} color="#FFFFFF" /></View>
          <View style={styles.text}>
            <Text style={[ty.footnoteEm, styles.title]} numberOfLines={1}>{title}</Text>
            <Text style={[ty.caption2, styles.subtitle]} numberOfLines={1}>{courseTitle}</Text>
          </View>
        </Pressable>
        <Pressable onPress={onToggle} accessibilityRole="button" accessibilityLabel={playing ? tr('Пауза') : tr('Продолжить')}
          style={({ pressed }) => [styles.play, pressed && styles.pressed]}>
          <SF name={playing ? 'pause.fill' : 'play.fill'} size={20} color="#FFFFFF" />
        </Pressable>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={tr('Остановить')}
          accessibilityHint={tr('Остановить воспроизведение и закрыть мини-плеер')}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <SF name="xmark" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
      <View pointerEvents="none" style={styles.progressTrack}>
        <View style={[styles.progress, { width: `${fraction * 100}%` }]} />
      </View>
      <View pointerEvents="none" style={styles.rim} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  elevation: { shadowColor: '#001B45', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  capsule: { borderRadius: 999, overflow: 'hidden', borderCurve: 'continuous' },
  solid: { backgroundColor: '#0068CC' },
  tint: { backgroundColor: 'rgba(0,91,185,0.94)' },
  rim: { ...StyleSheet.absoluteFillObject, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.28)' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingLeft: 18, paddingRight: 8, gap: 6 },
  source: { flex: 1, minWidth: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sourceIcon: { width: 26, alignItems: 'center' },
  text: { flex: 1, minWidth: 0 },
  title: { color: '#FFFFFF' },
  subtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 1 },
  play: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.09)', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.65 },
  progressTrack: { position: 'absolute', left: 36, right: 36, bottom: 4, height: 2, borderRadius: 1, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.18)' },
  progress: { height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.9)' },
});
