import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useVideoPlayer } from 'expo-video';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../../components/SFIcon';
import { ty } from '../../components/ui';
import { BackNav } from '../../components/headers';
import { useDownloads, DownloadItem } from '../../state/DownloadsContext';
import { ProfileStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParams, 'Downloads'>;

function fmt(sec: number) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60); const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function DownloadsScreen({ navigation }: Props) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, remove } = useDownloads();
  const player = useVideoPlayer(null, (p) => { p.loop = false; });
  const [sel, setSel] = useState<DownloadItem | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const barW = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      try { setPlaying(!!player.playing); setPos(player.currentTime ?? 0); if (player.duration && isFinite(player.duration)) setDur(player.duration); } catch {}
    }, 300);
    return () => clearInterval(id);
  }, [player]);

  const select = (it: DownloadItem) => {
    setSel(it); setPos(0); setDur(0);
    try { player.replace(it.uri); player.play(); } catch {}
  };
  const toggle = () => { try { if (player.playing) player.pause(); else player.play(); } catch {} };
  const seekBy = (d: number) => { try { player.currentTime = Math.max(0, (player.currentTime ?? 0) + d); } catch {} };
  const seekTo = (x: number) => { if (!barW.current || !dur) return; try { player.currentTime = Math.max(0, Math.min(dur, (x / barW.current) * dur)); } catch {} };
  const pct = dur > 0 ? Math.min(1, pos / dur) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back="Профиль" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + (sel ? 200 : 30) }}>
        <Text style={[ty.largeTitle, { color: T.label, marginBottom: 4 }]}>Загрузки</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary, marginBottom: 16 }]}>Скачанные аудио-уроки доступны без интернета.</Text>

        {items.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 50 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}>
              <SF name="arrow.down.circle" size={30} color={T.labelSecondary} />
            </View>
            <Text style={[ty.headline, { color: T.label, marginTop: 14 }]}>Пока нет загрузок</Text>
            <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 6, textAlign: 'center' }]}>В купленном курсе откройте урок и нажмите «Скачать аудио».</Text>
          </View>
        ) : items.map((it) => {
          const on = sel?.key === it.key;
          return (
            <View key={it.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.cardBg, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 0.5, borderColor: on ? T.brand : T.cardBorder }}>
              <Pressable onPress={() => select(it)} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
                <SF name={on && playing ? 'pause.fill' : 'play.fill'} size={20} color={T.brand} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={1}>{it.title}</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>{it.courseTitle}</Text>
              </View>
              <Pressable onPress={() => { if (on) { try { player.pause(); } catch {} setSel(null); } remove(it.key); }} hitSlop={8}>
                <SF name="trash.fill" size={16} color={T.red} />
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      {sel ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator, padding: 16, paddingBottom: insets.bottom + 14 }}>
          <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={1}>{sel.title}</Text>
          <Pressable onLayout={(e) => { barW.current = e.nativeEvent.layout.width; }} onPress={(e) => seekTo(e.nativeEvent.locationX)} style={{ paddingVertical: 8, marginTop: 8 }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: T.fillSecondary, overflow: 'hidden' }}>
              <View style={{ width: `${pct * 100}%`, height: 6, borderRadius: 3, backgroundColor: T.brand }} />
            </View>
          </Pressable>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[ty.caption2, { color: T.labelSecondary }]}>{fmt(pos)}</Text>
            <Text style={[ty.caption2, { color: T.labelSecondary }]}>{dur > 0 ? fmt(dur) : '—'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, marginTop: 8 }}>
            <Pressable onPress={() => seekBy(-15)} hitSlop={8}><SF name="gobackward.15" size={28} color={T.label} /></Pressable>
            <Pressable onPress={toggle} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
              <SF name={playing ? 'pause.fill' : 'play.fill'} size={28} color="#fff" />
            </Pressable>
            <Pressable onPress={() => seekBy(15)} hitSlop={8}><SF name="goforward.15" size={28} color={T.label} /></Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
