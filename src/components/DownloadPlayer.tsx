import React from 'react';
import { Text, View } from 'react-native';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { BottomBar } from './BottomBar';
import { HeaderIcon } from './HeaderIcon';
import { PlaybackSeekBar } from './PlaybackSeekBar';

export function DownloadPlayer({ title, courseTitle, playing, currentTime, duration, onToggle, onSeek }: {
  title: string; courseTitle: string; playing: boolean; currentTime: number; duration: number; onToggle: () => void; onSeek: (seconds: number) => void;
}) {
  const { T, ty } = useTheme();
  return <BottomBar>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <HeaderIcon name={playing ? 'pause.fill' : 'play.fill'} variant="primary" label={playing ? tr('Пауза') : tr('Воспроизвести')} onPress={onToggle} />
      <View style={{ flex: 1, gap: 4 }}><Text style={[ty.subheadEm, { color: T.label }]}>{title}</Text>
        <Text style={[ty.footnote, { color: T.labelSecondary }]}>{courseTitle}</Text></View>
    </View>
    <PlaybackSeekBar currentTime={currentTime} duration={duration} onSeek={onSeek} />
  </BottomBar>;
}
