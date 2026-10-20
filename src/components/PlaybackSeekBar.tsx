import React, { useState } from 'react';
import { GestureResponderEvent, Text, View } from 'react-native';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { ProgressBar } from './ProgressBar';

function time(seconds: number) {
  const safe = Math.floor(Number.isFinite(seconds) ? Math.max(0, seconds) : 0);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}
export function PlaybackSeekBar({ currentTime, duration, onSeek }: { currentTime: number; duration: number; onSeek: (seconds: number) => void }) {
  const { T, ty } = useTheme();
  const [width, setWidth] = useState(0);
  const fraction = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
  const seek = (event: GestureResponderEvent) => {
    if (width > 0 && duration > 0) onSeek(Math.max(0, Math.min(width, event.nativeEvent.locationX)) / width * duration);
  };
  return <View style={{ gap: 2 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={[ty.footnote, { color: T.labelSecondary, fontVariant: ['tabular-nums'] }]}>{time(currentTime)}</Text>
      <Text style={[ty.footnote, { color: T.labelSecondary, fontVariant: ['tabular-nums'] }]}>{time(duration)}</Text>
    </View>
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)} onStartShouldSetResponder={() => true}
      onResponderGrant={seek} onResponderMove={seek} accessible accessibilityRole="adjustable"
      accessibilityLabel={tr('Позиция воспроизведения')} accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100), text: `${time(currentTime)} ${tr('из')} ${time(duration)}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={event => {
        if (duration <= 0) return;
        const delta = event.nativeEvent.actionName === 'increment' ? 15 : event.nativeEvent.actionName === 'decrement' ? -15 : 0;
        if (delta) onSeek(Math.max(0, Math.min(duration, currentTime + delta)));
      }} style={{ minHeight: 48, justifyContent: 'center' }}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><ProgressBar value={fraction} /></View>
    </View>
  </View>;
}
