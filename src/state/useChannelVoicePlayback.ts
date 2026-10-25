import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';

const PLAYBACK = { playsInSilentModeIOS: true, allowsRecordingIOS: false, staysActiveInBackground: true } as const;

/** Голосовые публикации канала через expo-av: удалённый m4a с UploadThing играет надёжно, а сессия
 * общая с записью — после неё звук не остаётся выключенным. Доигрывает после сворачивания. */
export function useChannelVoicePlayback() {
  const sound = useRef<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  useEffect(() => {
    Audio.setAudioModeAsync(PLAYBACK).catch(() => {});
    return () => { sound.current?.unloadAsync().catch(() => {}); sound.current = null; };
  }, []);
  const toggle = useCallback(async (id: string, url?: string | null) => {
    if (!url) return;
    try {
      if (playingId === id) { await sound.current?.pauseAsync().catch(() => {}); setPlayingId(null); return; }
      if (sound.current) { await sound.current.unloadAsync().catch(() => {}); sound.current = null; }
      await Audio.setAudioModeAsync(PLAYBACK);
      const created = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      sound.current = created.sound; setPlayingId(id);
      created.sound.setOnPlaybackStatusUpdate(st => {
        if (st.isLoaded && st.didJustFinish) { setPlayingId(null); created.sound.unloadAsync().catch(() => {}); sound.current = null; }
      });
    } catch { setPlayingId(null); }
  }, [playingId]);
  return { playingId, toggle };
}
