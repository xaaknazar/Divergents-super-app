// Небольшая шина событий для профиля Talentslab.
//
// `useTalentProfile` — это хук, поэтому у каждого экрана своя копия состояния.
// Раньше из-за этого изменения анкеты (имя, фото, псевдоним, Gallup) появлялись
// только после перезапуска приложения: экран, который сохранил данные, знал о
// них, а остальные — нет.
//
// Теперь любой код, который изменил профиль, вызывает `emitProfileChanged()`, и
// ВСЕ смонтированные экземпляры хука тихо обновляются сразу.
type Listener = () => void;

const listeners = new Set<Listener>();

export function onProfileChanged(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function emitProfileChanged(): void {
  // Копия списка: обработчик может отписаться прямо во время рассылки.
  for (const fn of Array.from(listeners)) {
    try { fn(); } catch { /* один сломанный подписчик не должен ломать остальные */ }
  }
}
