import React, { useMemo, useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, ScrollView, Alert, GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { SF } from '../../components/SFIcon';
import { NavHeader } from '../../components/NavHeader';
import { ListSection, ty } from '../../components/ui';
import { EmptyState } from '../../components/StateViews';
import { useDownloads, DownloadRecord } from '../../state/downloads';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'Downloads'>;

function fmtTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
function fmtSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} МБ` : `${Math.max(1, Math.round(bytes / 1024))} КБ`;
}

export function DownloadsScreen({ navigation }: Props) {
  const { T } = useTheme();
  useLang();
  const insets = useSafeAreaInsets();
  const { items, removeDownload } = useDownloads();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Single audio player reused for whichever lesson is tapped. Audio-only m4a
  // plays fine through expo-video; background playback keeps it going off-screen.
  const player = useVideoPlayer(null, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.4;
    p.staysActiveInBackground = true;
    p.showNowPlayingNotification = true;
  });
  const playingEvent = useEvent(player, 'playingChange', null);
  const isPlaying = playingEvent ? playingEvent.isPlaying : player.playing;
  const timeEvent = useEvent(player, 'timeUpdate', null);
  const currentTime = timeEvent?.currentTime ?? 0;
  const duration = player.duration || 0;

  const [barWidth, setBarWidth] = useState(0);
  const selected = useMemo(() => items.find((i) => i.lessonId === selectedId) ?? null, [items, selectedId]);

  // Group downloads by course, preserving the newest-first order of `items`.
  const groups = useMemo(() => {
    const map = new Map<string, { title: string; rows: DownloadRecord[] }>();
    for (const it of items) {
      const g = map.get(it.courseId);
      if (g) g.rows.push(it);
      else map.set(it.courseId, { title: it.courseTitle, rows: [it] });
    }
    return Array.from(map.values());
  }, [items]);

  const play = (rec: DownloadRecord) => {
    try {
      if (selectedId !== rec.lessonId) {
        setSelectedId(rec.lessonId);
        player.replace(rec.localUri);
        player.play();
      } else if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    } catch {}
  };

  const seek = (e: GestureResponderEvent) => {
    if (barWidth <= 0 || duration <= 0) return;
    const x = Math.max(0, Math.min(barWidth, e.nativeEvent.locationX));
    try { player.currentTime = (x / barWidth) * duration; } catch {}
  };

  const confirmDelete = (rec: DownloadRecord) => {
    Alert.alert(
      tr('Удалить загрузку?'),
      rec.title,
      [
        { text: tr('Отмена'), style: 'cancel' },
        {
          text: tr('Удалить'), style: 'destructive',
          onPress: () => {
            if (selectedId === rec.lessonId) {
              try { player.pause(); player.replace(null); } catch {}
              setSelectedId(null);
            }
            removeDownload(rec.lessonId);
          },
        },
      ],
    );
  };

  const frac = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: T.systemBg }}>
      <NavHeader title={tr('Загрузки')} onBack={() => navigation.goBack()} hairline />

      {items.length === 0 ? (
        <View style={{ flex: 1 }}>
          <EmptyState icon="arrow.down.circle" title={tr('Нет загрузок')} subtitle={tr('Скачайте аудио уроков из открытого курса, чтобы слушать их без интернета.')} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + (selected ? 150 : 30) }}>
          {groups.map((g, gi) => (
            <ListSection key={gi} header={g.title}>
              {g.rows.map((rec, i) => {
                const active = rec.lessonId === selectedId;
                return (
                  <Pressable key={rec.lessonId} onPress={() => play(rec)} onLongPress={() => confirmDelete(rec)}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: active ? T.brandTinted : 'transparent', opacity: pressed ? 0.6 : 1 })}>
                    <View style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: active ? T.brand : T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
                      <SF name={active && isPlaying ? 'pause.fill' : 'play.fill'} size={16} color={active ? '#fff' : T.brand} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[ty.body, { color: T.label }]} numberOfLines={2}>{rec.n ? `${rec.n}. ` : ''}{rec.title}</Text>
                      <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>
                        {[fmtSize(rec.size), tr('Доступно офлайн')].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <Pressable onPress={() => confirmDelete(rec)} hitSlop={10}>
                      <SF name="trash" size={18} color={T.labelTertiary} />
                    </Pressable>
                    {i < g.rows.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 60, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
                  </Pressable>
                );
              })}
            </ListSection>
          ))}
        </ScrollView>
      )}

      {/* Mini player */}
      {selected ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={() => { try { isPlaying ? player.pause() : player.play(); } catch {} }}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
              <SF name={isPlaying ? 'pause.fill' : 'play.fill'} size={18} color="#fff" />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={1}>{selected.title}</Text>
              <Text style={[ty.caption2, { color: T.labelSecondary }]} numberOfLines={1}>{selected.courseTitle}</Text>
            </View>
          </View>
          {/* Seek bar */}
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={[ty.caption2, { color: T.labelSecondary, width: 38, textAlign: 'right' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{fmtTime(currentTime)}</Text>
            <View
              onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onResponderGrant={seek}
              onResponderMove={seek}
              style={{ flex: 1, height: 24, justifyContent: 'center' }}>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: T.fillTertiary, overflow: 'hidden' }}>
                <View style={{ width: `${frac * 100}%`, height: '100%', borderRadius: 2, backgroundColor: T.brand }} />
              </View>
            </View>
            <Text style={[ty.caption2, { color: T.labelSecondary, width: 38 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{fmtTime(duration)}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
