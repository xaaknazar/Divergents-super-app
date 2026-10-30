/** Optimistic task values are not proof of a durable server write. */
export function progressSyncPresentation(input: {
  completed: number; total: number; pending: boolean; error: string | null; dayLocked: boolean;
}) {
  const { completed, total, pending, error, dayLocked } = input;
  const confirmed = !pending && !error;
  const done = total > 0 && completed === total;
  const messages: Record<string, string> = {
    protocol_mismatch: 'Сервер не поддерживает подтверждение отметок этой версии. Данные остаются на устройстве. Проверьте отметки на сайте.',
    invalid_receipt: 'Сервер не подтвердил запись. Данные остаются на устройстве; повторим автоматически. Проверьте отметки на сайте.',
    version_conflict: 'Данные изменились на сервере. Проверьте результат и повторите нужную правку.',
    storage: 'Не удалось сохранить на устройстве. Не закрывайте приложение и повторите попытку.',
    upgrade_required: 'Обновите приложение, чтобы сохранять отметки.',
    authentication: 'Не удалось подтвердить вход. Отметки пока не подтверждены; повторим автоматически.',
    'no-token': 'Не удалось подтвердить вход. Отметки пока не подтверждены; повторим автоматически.',
    day_changed: 'Есть неподтверждённые отметки за прошлый день. Проверьте историю и обратитесь к администратору.',
    deadline_passed: 'Сервер отклонил отметку после закрытия дня. Проверьте историю и обратитесь к администратору.',
  };
  const message = error && error !== 'network' && error !== 'server'
    ? messages[error] ?? 'Отметка не принята сервером. Обновите экран и проверьте результат.'
    : pending || error ? 'Отметки ещё не подтверждены сервером · повторим автоматически'
      : dayLocked ? 'Отметки закрыты · откроются в 00:00'
        : 'Синхронизировано с сервером · итог дня в 23:01';
  return {
    label: error ? 'Не подтверждено' : pending ? 'Сохраняем…' : done ? 'Готово' : `${completed}/${total}`,
    tone: !confirmed ? 'warning' as const : done ? 'success' as const : 'brand' as const,
    icon: !confirmed ? 'clock.arrow.circlepath' : done ? 'checkmark.circle.fill' : 'target',
    confirmed, message,
  };
}
