// Полоска «сейчас играет».
//
// Плеер продолжает работать при переходах между экранами, но без этой полоски
// человек не увидел бы, что именно звучит, не смог бы поставить паузу и — что
// важнее — не нашёл бы дорогу обратно к свёрнутому уроку. Ставим название,
// паузу, возврат и крестик: перемотка живёт на самом экране урока или загрузок,
// а здесь важнее не занимать место.
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { minTouch } from '../theme/tokens';
import { useAudioPlayer } from '../state/AudioPlayerContext';
import { navigationRef } from '../navigation/ref';
import { tr } from '../state/LanguageContext';

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
  const { T, ty } = useTheme();
  const { track, isPlaying, currentTime, duration, toggle, clear } = useAudioPlayer();

  if (!track) return null;

  const progress = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
  const isLesson = track.kind === 'lesson';

  return (
    <View style={{ borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
      {/* Тонкая полоса прогресса вместо цифр: на такой высоте время читалось бы
          хуже, чем занимало места. */}
      <View style={{ height: 2, backgroundColor: T.fillTertiary }}>
        <View style={{ width: `${progress * 100}%`, height: 2, backgroundColor: T.brand }} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 4, paddingVertical: 6, gap: 8 }}>
        {/* Иконка отвечает на вопрос «а это что играет»: видеоурок или скачанная
            аудиозапись. Без неё две очень разные вещи выглядят одинаково. */}
        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
          <SF name={isLesson ? 'play.circle.fill' : 'headphones'} size={16} color={T.brand} />
        </View>

        <Pressable
          onPress={() => openSource(track)}
          accessibilityRole="button"
          accessibilityLabel={`${tr('Сейчас играет')}: ${track.title}`}
          accessibilityHint={isLesson ? tr('Открыть урок') : tr('Открыть загрузки')}
          style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={[ty.footnoteEm, { color: T.label }]} numberOfLines={1}>{track.title}</Text>
          <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>{track.courseTitle}</Text>
        </Pressable>

        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? tr('Пауза') : tr('Продолжить')}
          style={({ pressed }) => ({
            minWidth: minTouch, minHeight: minTouch,
            alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1,
          })}
        >
          <SF name={isPlaying ? 'pause.fill' : 'play.fill'} size={20} color={T.brand} />
        </Pressable>

        {/* Без крестика свёрнутый урок нечем убрать: пауза оставляет полоску на
            месте, а закрыть её иначе можно было бы только перезапуском. */}
        <Pressable
          onPress={clear}
          accessibilityRole="button"
          accessibilityLabel={tr('Остановить')}
          style={({ pressed }) => ({
            minWidth: 40, minHeight: minTouch,
            alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1,
          })}
        >
          <SF name="xmark" size={14} color={T.labelSecondary} />
        </Pressable>
      </View>
    </View>
  );
}
