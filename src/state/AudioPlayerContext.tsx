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
import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { useVideoPlayer, VideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import type { DownloadRecord } from './downloads';

/** Что сейчас звучит. Достаточно и для подписи в мини-плеере, и для возврата. */
export interface AudioTrack {
  lessonId: string;
  title: string;
  courseTitle: string;
  uri: string;
  /**
   * Откуда играем:
   *   'download' — скачанный на телефон файл, пульт к нему на экране «Загрузки»;
   *   'lesson'   — видеоурок курса, пульт к нему на экране урока.
   * От этого зависит, куда вернёт тап по мини-плееру.
   */
  kind: 'download' | 'lesson';
  /** Только для 'lesson': к какому курсу возвращаться. */
  courseId?: string;
}

/** Что нужно знать плееру, чтобы включить видеоурок. */
export interface LessonSource {
  courseId: string;
  lessonId: string;
  title: string;
  courseTitle: string;
  /** HLS-ссылка урока. */
  uri: string;
}

interface AudioPlayerValue {
  /** Текущий трек или null, если ничего не выбрано. */
  track: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  /** Включить скачанный урок. Тот же самый — переключает паузу. */
  play: (rec: DownloadRecord) => void;
  /**
   * Открыть видеоурок в общем плеере. Если этот урок уже играет — НИЧЕГО не
   * делает: человек вернулся на экран и должен увидеть ту же секунду, а не
   * начало. Именно поэтому проверка идёт по ссылке, а не только по id: у урока
   * ссылка подписанная и может обновиться.
   */
  openLesson: (l: LessonSource) => void;
  pause: () => void;
  toggle: () => void;
  /** Перемотка на абсолютную позицию в секундах. */
  seekTo: (sec: number) => void;
  /** Сдвиг относительно текущей позиции (±15 с). */
  seekBy: (deltaSec: number) => void;
  /** Убрать трек — например, когда его файл удалили. */
  clear: () => void;
  /** Низкоуровневый доступ: нужен экрану урока для картинки и экрану загрузок для событий. */
  player: VideoPlayer;
}

const Ctx = createContext<AudioPlayerValue | null>(null);

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

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAudioPlayer(): AudioPlayerValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAudioPlayer используется вне AudioPlayerProvider');
  return v;
}
