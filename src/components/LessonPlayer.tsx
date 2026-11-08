import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { VideoView, type VideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { tr } from '../state/LanguageContext';
import { SF } from './SFIcon';

export interface LessonPlayerProps {
  player: VideoPlayer;
  lessonNumber: number;
  title: string;
  state: 'ready' | 'loading' | 'locked' | 'unavailable' | 'demo';
  onMinimize: () => void;
}

/** App navigation stays outside AVKit/ExoPlayer's entire control surface. */
export function LessonPlayer({ player, lessonNumber, title, state, onMinimize }: LessonPlayerProps) {
  const { ty } = useTheme();
  const insets = useSafeAreaInsets();
  const fallback = state === 'locked'
    ? { icon: 'lock.fill', title: 'Урок доступен владельцам курса', message: 'Этот урок откроется вместе с доступом к курсу' }
    : state === 'unavailable'
      ? { icon: 'exclamationmark.triangle.fill', title: 'Видео недоступно', message: 'Видео этого урока сейчас не загружается. Проверьте подключение или попробуйте позже.' }
      : { icon: 'play.circle.fill', title: 'Демо-урок без видео', message: '' };

  return <View style={[styles.surface, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
    <View style={styles.navigation}>
      <Pressable onPress={onMinimize} accessibilityRole="button"
        accessibilityLabel={tr('Свернуть урок')}
        accessibilityHint={tr('Урок продолжит играть, управление появится над вкладками')}
        style={({ pressed }) => [styles.minimize, { opacity: pressed ? 0.6 : 1 }]}>
        <SF name="chevron.down" size={20} color="#FFFFFF" />
      </Pressable>
      <View style={styles.heading}>
        <Text style={[ty.subheadEm, styles.title]} numberOfLines={1}>{tr('Урок')} {lessonNumber}</Text>
        <Text style={[ty.caption2, styles.subtitle]} numberOfLines={1}>{title}</Text>
      </View>
    </View>
    <View style={state === 'ready' || state === 'loading' ? styles.video : styles.placeholderFrame}>
      {state === 'ready' ? (
        // Fullscreen, Picture in Picture, AirPlay and playback belong to the
        // native player. No custom buttons are layered over its video bounds.
        <VideoView player={player} style={styles.nativeVideo} contentFit="contain"
          nativeControls allowsPictureInPicture fullscreenOptions={{ enable: true }} />
      ) : state === 'loading' ? <ActivityIndicator color="#FFFFFF" accessibilityLabel={tr('Загрузка видео')} /> : (
        <View style={styles.placeholder}>
          <SF name={fallback.icon} size={32} color="#FFFFFF" />
          <Text style={[ty.headline, styles.placeholderTitle]}>{tr(fallback.title)}</Text>
          {fallback.message ? <Text style={[ty.footnote, styles.placeholderMessage]}>{tr(fallback.message)}</Text> : null}
        </View>
      )}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  surface: { backgroundColor: '#0E1729' },
  navigation: { minHeight: 56, paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 12 },
  minimize: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, minWidth: 0 },
  title: { color: '#FFFFFF' },
  subtitle: { color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  // A height cap also constrains Yoga's aspect-ratio width on wider phones.
  // Let the full-width frame determine its height; contain preserves the complete video.
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  nativeVideo: { width: '100%', height: '100%' },
  placeholderFrame: { minHeight: 180, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  placeholder: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, gap: 8 },
  placeholderTitle: { color: '#FFFFFF', textAlign: 'center' },
  placeholderMessage: { color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
});
