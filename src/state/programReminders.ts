// Ежедневные напоминания по программам — локальные уведомления телефона.
//
// Не серверные пуши: программа живёт только на телефоне, серверу о ней знать
// незачем, а локальное уведомление сработает и без сети. Одно повторяющееся
// уведомление на программу; когда программа закончилась или удалена — снимаем.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { FitnessProgram } from '../data/fitness';

const CHANNEL = 'program-reminders';

/** Разрешение на уведомления. Спрашиваем один раз, при первом напоминании. */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Напоминания о программах',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    return status === 'granted';
  } catch {
    return false;
  }
}

/** Поставить (или переставить) ежедневное напоминание. Возвращает id или null. */
export async function scheduleProgramReminder(p: FitnessProgram): Promise<string | null> {
  await cancelProgramReminder(p.notificationId);
  if (!p.remindAt) return null;
  if (!(await ensureNotificationPermission())) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `${p.title}: ${p.target} ${p.unit}`,
        body: 'Пора. Отметьте в «Моих тренировках», когда сделаете.',
        sound: 'default',
        data: { target: { tab: 'ProfileTab', screen: 'MyFitness' } },
        ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: p.remindAt.hour,
        minute: p.remindAt.minute,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}),
      },
    });
  } catch {
    return null;
  }
}

export async function cancelProgramReminder(id: string | null | undefined): Promise<void> {
  if (!id) return;
  try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* уже нет */ }
}
