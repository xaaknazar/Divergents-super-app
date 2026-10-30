import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tr } from '../state/LanguageContext';
import { SF } from './SFIcon';
import { ProgressBar } from './ProgressBar';

type DownloadRowProps = { title: string; number?: number; onAction: () => void } & (
  { state: 'pending'; progress: number; courseTitle: string } |
  { state: 'downloaded'; bytes: number; selected: boolean; playing: boolean; onPlay: () => void } |
  { state: 'available'; busy: boolean; progress?: number }
);
export function DownloadRow(props: DownloadRowProps) {
  const { T, ty } = useTheme();
  const downloaded = props.state === 'downloaded';
  const pending = props.state === 'pending';
  const active = downloaded && props.selected;
  const blocked = props.state === 'available' && props.busy;
  const title = `${props.number ? props.number + '. ' : ''}${props.title}`;
  let subtitle: string;
  if (props.state === 'pending') subtitle = `${props.courseTitle} · ${Math.round(props.progress * 100)}%`;
  else if (props.state === 'downloaded') {
    const mb = props.bytes / (1024 * 1024);
    const size = props.bytes > 0 ? mb >= 1 ? `${mb.toFixed(1)} МБ` : `${Math.max(1, Math.round(props.bytes / 1024))} КБ` : '';
    subtitle = [size, tr('Доступно офлайн')].filter(Boolean).join(' · ');
  } else subtitle = props.busy ? `${tr('Скачивание')} ${Math.round((props.progress ?? 0) * 100)}%` : tr('Аудио для офлайна');
  return <View style={{ padding: 14, gap: 10, backgroundColor: active ? T.brandTinted : 'transparent' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable accessible={downloaded} disabled={!downloaded} onPress={downloaded ? props.onPlay : undefined} onLongPress={downloaded ? props.onAction : undefined}
        accessibilityRole={downloaded ? 'button' : undefined} accessibilityLabel={downloaded ? `${title}. ${active && props.playing ? tr('Пауза') : tr('Воспроизвести')}` : undefined}
        accessibilityState={downloaded ? { selected: active } : undefined}
        style={({ pressed }) => ({ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.65 : 1 })}>
        {pending ? <ActivityIndicator color={T.brandText} /> : <SF name={downloaded ? active && props.playing ? 'pause.circle.fill' : 'play.circle.fill' : 'headphones'} size={26} color={T.brandText} />}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[ty.body, { color: T.label }]}>{title}</Text>
          <Text style={[ty.footnote, { color: T.labelSecondary }]}>{subtitle}</Text>
        </View>
      </Pressable>
      <Pressable onPress={props.onAction} disabled={blocked} accessibilityRole="button"
        accessibilityLabel={pending ? tr('Остановить загрузку') : downloaded ? tr('Удалить загрузку') : tr('Скачать аудио')}
        accessibilityState={{ disabled: blocked, busy: blocked }}
        style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.65 : 1 })}>
        {blocked ? <ActivityIndicator color={T.brandText} /> : <SF name={pending ? 'xmark.circle' : downloaded ? 'trash' : 'arrow.down.circle'} size={24} color={downloaded ? T.redText : T.brandText} />}
      </Pressable>
    </View>
    {props.state === 'pending' ? <ProgressBar value={props.progress} size="thin" accessibilityLabel={tr('Загрузка')} /> : null}
  </View>;
}
