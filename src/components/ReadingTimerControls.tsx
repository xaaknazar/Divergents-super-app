import React from 'react';
import { Button } from './Button';

const ACTIONS = {
  start: { label: 'Старт', icon: 'play.fill', hint: 'Начать подход: таймер пойдёт, выбранные приложения ограничатся' },
  pause: { label: 'Пауза', icon: 'pause.fill', hint: 'Остановить время и снять ограничения. Затем запишите страницы за подход' },
  resume: { label: 'Возобновить', icon: 'play.fill', hint: 'Продолжить чтение: таймер пойдёт с того же места, ограничения включатся снова' },
} as const;

/** Одна кнопка таймера по состоянию: «Старт» (на 60:00), «Пауза» (идёт отсчёт), «Возобновить»
 * (после паузы или после первого подхода за день). Пауза — локальное действие, не ждёт сети.
 * secondary — когда под таймером уже есть главная кнопка формы страниц. */
export function ReadingTimerControls({ action, onPress, disabled = false, loading = false, secondary = false }: {
  action: keyof typeof ACTIONS; onPress: () => void; disabled?: boolean; loading?: boolean; secondary?: boolean;
}) {
  const a = ACTIONS[action];
  return <Button label={a.label} icon={a.icon} size="large" variant={secondary ? 'tinted' : 'solid'} onPress={onPress}
    disabled={disabled} loading={action === 'pause' ? false : loading} accessibilityHint={a.hint} />;
}
