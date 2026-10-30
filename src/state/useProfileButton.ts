import { useUser } from '@clerk/clerk-expo';
import type { ProfileAvatarButtonProps } from '../components/ProfileAvatarButton';
import { useOptionalNotifications } from './NotificationsContext';
import { useTalentProfile } from './useTalentProfile';

/** Данные кнопки профиля в шапке вкладки: фото, имя для инициалов, заполненность
 * анкеты и число непрочитанных уведомлений. Приоритет фото — как в useProfilePhoto. */
export function useProfileButton(): Pick<ProfileAvatarButtonProps, 'photoUrl' | 'name' | 'progress' | 'badge'> {
  const { user } = useUser();
  const { profile } = useTalentProfile();
  const notifications = useOptionalNotifications();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || profile?.fullName || user?.fullName || null;
  return {
    photoUrl: profile?.photoUrl || user?.imageUrl || null,
    name,
    progress: profile?.completeness ?? 0,
    badge: notifications?.unread ?? 0,
  };
}
