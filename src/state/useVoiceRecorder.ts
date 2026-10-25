import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

/** Запись голосового для публикации. После остановки аудиосессия выходит из режима записи,
 * иначе воспроизведение (голосовые, уроки) остаётся беззвучным. */
export function useVoiceRecorder() {
  const recording = useRef<Audio.Recording | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  const stopTimer = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
  useEffect(() => () => { stopTimer(); recording.current?.stopAndUnloadAsync().catch(() => {}); }, []);
  const start = useCallback(async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert('Нет доступа к микрофону', 'Разрешите запись в настройках.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const next = new Audio.Recording();
      await next.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await next.startAsync();
      recording.current = next; setActive(true); setSeconds(0); setUri(null);
      timer.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch { Alert.alert('Ошибка записи', 'Не удалось начать запись.'); }
  }, []);
  const stop = useCallback(async () => {
    stopTimer(); setActive(false);
    try { const r = recording.current; if (r) { await r.stopAndUnloadAsync(); setUri(r.getURI() ?? null); } } catch { /* nothing recorded */ }
    recording.current = null;
    try { await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: true }); } catch { /* keep going */ }
  }, []);
  const reset = useCallback(() => { setUri(null); setSeconds(0); }, []);
  return { active, seconds, uri, start, stop, reset };
}
