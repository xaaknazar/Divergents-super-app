// Общий проигрыватель уроков — один на всё приложение.
//
// Раньше плеер жил внутри экрана. Экран в React Navigation размонтируется,
// когда человек уходит на другую вкладку, — вместе с ним освобождался и плеер,
// и лекция обрывалась на полуслове. Свернуть приложение было можно (это
// чинится флагами фонового воспроизведения), а вот заглянуть в челлендж и
// вернуться — нет.
//
// Поэтому плеер создаётся здесь, над навигатором: он переживает любые переходы
// между экранами и вкладками. Экран урока и экран «Загрузки» становятся
// пультами к нему, а мини-плеер даёт паузу и возврат из любого места.
//
// Плеер ОДИН на оба вида уроков — скачанный файл и видеоурок с сайта. Два
// плеера означали бы, что скачанная лекция и видеоурок могут звучать
// одновременно, перекрикивая друг друга; с одним «включить» всегда значит
// «вместо того, что играло».
import React, { useCallback, useMemo, useRef } from 'react';
import { useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import type { DownloadRecord } from './downloads';
import { AudioPlaybackContext, AudioTrackContext } from './audioPlayerValue';
import type { AudioPlayerValue, AudioTrack, LessonSource } from './audioPlayerValue';
export { useAudioPlayer, useOptionalAudioPlayer, useOptionalAudioTrack } from './audioPlayerValue';
export type { AudioPlayerValue, AudioTrack, LessonSource } from './audioPlayerValue';

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [track, setTrackState] = React.useState<AudioTrack | null>(null);
  // Зеркало состояния в ref: `openLesson` вызывается из эффекта экрана урока и
  // должен быть стабильным. Если бы он зависел от `track`, каждая смена трека
  // меняла бы функцию, эффект перезапускался бы и урок начинался заново.
  const trackRef = useRef<AudioTrack | null>(null);
  const setTrack = useCallback((t: AudioTrack | null) => {
    trackRef.current = t;
    setTrackState(t);
  }, []);

  // Аудио-only m4a и HLS-видео одинаково играют через expo-video, отдельный
  // аудио-модуль не нужен. Фоновые флаги — чтобы звук не глох при сворачивании
  // приложения; нативную часть включает плагин expo-video в app.config.ts.
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

  const play = useCallback((rec: DownloadRecord) => {
    try {
      const cur = trackRef.current;
      if (cur?.kind === 'download' && cur.lessonId === rec.lessonId) {
        // Тот же урок — это пауза/продолжить, а не перезапуск с нуля.
        if (player.playing) player.pause();
        else player.play();
        return;
      }
      setTrack({
        lessonId: rec.lessonId,
        title: rec.title,
        courseTitle: rec.courseTitle,
        uri: rec.localUri,
        kind: 'download',
      });
      // Подпись для экрана блокировки задаётся у ИСТОЧНИКА: у плеера такого
      // свойства нет.
      player.replace({
        uri: rec.localUri,
        metadata: { title: rec.title, artist: rec.courseTitle },
      });
      player.play();
    } catch {}
  }, [player, setTrack]);

  const openLesson = useCallback((l: LessonSource) => {
    try {
      const cur = trackRef.current;
      if (cur?.kind === 'lesson' && cur.lessonId === l.lessonId && cur.uri === l.uri) return;
      setTrack({
        lessonId: l.lessonId,
        title: l.title,
        courseTitle: l.courseTitle,
        uri: l.uri,
        kind: 'lesson',
        courseId: l.courseId,
      });
      player.replace({ uri: l.uri, metadata: { title: l.title, artist: l.courseTitle } });
      player.play();
    } catch {}
  }, [player, setTrack]);

  const pause = useCallback(() => { try { player.pause(); } catch {} }, [player]);

  const toggle = useCallback(() => {
    try { player.playing ? player.pause() : player.play(); } catch {}
  }, [player]);

  const seekTo = useCallback((sec: number) => {
    try {
      const total = player.duration || 0;
      player.currentTime = Math.max(0, total > 0 ? Math.min(total, sec) : sec);
    } catch {}
  }, [player]);

  const seekBy = useCallback((deltaSec: number) => {
    try { seekTo((player.currentTime || 0) + deltaSec); } catch {}
  }, [player, seekTo]);

  const clear = useCallback(() => {
    try { player.pause(); player.replace(null); } catch {}
    setTrack(null);
  }, [player, setTrack]);

  const value = useMemo<AudioPlayerValue>(() => ({
    track, isPlaying, currentTime, duration,
    play, openLesson, pause, toggle, seekTo, seekBy, clear, player,
  }), [track, isPlaying, currentTime, duration, play, openLesson, pause, toggle, seekTo, seekBy, clear, player]);

  return (
    <AudioPlaybackContext.Provider value={value}>
      <AudioTrackContext.Provider value={track}>{children}</AudioTrackContext.Provider>
    </AudioPlaybackContext.Provider>
  );
}
