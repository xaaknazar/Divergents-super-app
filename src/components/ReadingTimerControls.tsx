import React from 'react';
import { Button } from './Button';

const ACTIONS = {
  start: { label: 'Старт', icon: 'play.fill', hint: 'Начать подход: таймер пойдёт, выбранные приложения ограничатся' },
  next: { label: 'Новый подход', icon: 'play.fill', hint: 'Предыдущие страницы сохранены. Начать новый подход с выбранной книгой' },
  pause: { label: 'Пауза', icon: 'pause.fill', hint: 'Остановить время и снять ограничения. Можно продолжить этот подход или отдельно сохранить страницы' },
  resume: { label: 'Возобновить', icon: 'play.fill', hint: 'Продолжить чтение: таймер пойдёт с того же места, ограничения включатся снова' },
} as const;

/** «Возобновить» продолжает тот же подход; «Новый подход» доступен после сохранения страниц.
 * Пауза — локальное действие, не ждёт сети. secondary — когда форма страниц уже главный шаг. */
export function ReadingTimerControls({ action, onPress, disabled = false, loading = false, secondary = false }: {
  action: keyof typeof ACTIONS; onPress: () => void; disabled?: boolean; loading?: boolean; secondary?: boolean;
}) {
  const a = ACTIONS[action];
  return <Button label={a.label} icon={a.icon} size="large" variant={secondary ? 'tinted' : 'solid'} onPress={onPress}
    disabled={disabled} loading={action === 'pause' ? false : loading} accessibilityHint={a.hint} />;
}
