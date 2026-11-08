// Полоска «сейчас играет».
//
// Плеер продолжает работать при переходах между экранами, но без этой полоски
// человек не увидел бы, что именно звучит, не смог бы поставить паузу и — что
// важнее — не нашёл бы дорогу обратно к свёрнутому уроку. Ставим название,
// паузу, возврат и крестик: перемотка живёт на самом экране урока или загрузок,
// а здесь важнее не занимать место.
import React from 'react';
import { navigationRef } from '../navigation/ref';
import { useAudioPlayer } from '../state/AudioPlayerContext';
import { MiniPlayerCard } from './MiniPlayerCard';

/** Куда вернуть человека по тапу: к уроку курса или на экран «Загрузки». */
function openSource(track: { kind: 'download' | 'lesson'; lessonId: string; courseId?: string }) {
  if (!navigationRef.isReady()) return;
  // `navigate` у типизированного ref требует пару аргументов, которую TypeScript
  // выводит из карты маршрутов; для вложенной цели проще передать один объект.
  const go = navigationRef.navigate as (arg: unknown) => void;
  if (track.kind === 'lesson' && track.courseId) {
    // `initial: false` — чтобы «назад» с урока вело к курсу, а не выбрасывало
    // из вкладки.
    go({
      name: 'Tabs',
      params: {
        screen: 'LMSTab',
        params: { screen: 'Video', params: { courseId: track.courseId, lessonId: track.lessonId }, initial: false },
      },
    });
    return;
  }
  go({ name: 'Tabs', params: { screen: 'LMSTab', params: { screen: 'Downloads' } } });
}

// Полоска живёт ВНУТРИ таб-бара, а не накладкой поверх экрана. Накладка была бы
// видна и на карточках — но там внизу стоят главные кнопки («Записаться»,
// «Завершить урок»), и полоска перекрыла бы именно их.
export function MiniPlayer() {
  const { track, isPlaying, currentTime, duration, toggle, clear } = useAudioPlayer();
  if (!track) return null;
  return <MiniPlayerCard title={track.title} courseTitle={track.courseTitle} kind={track.kind}
    playing={isPlaying} progress={duration > 0 ? currentTime / duration : 0}
    onOpen={() => openSource(track)} onToggle={toggle} onClose={clear} />;
}
