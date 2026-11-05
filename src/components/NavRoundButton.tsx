import React from 'react';
import { GlassButton } from './GlassButton';

/** Круглая кнопка поверх фото или обложки (назад, избранное, поделиться) — стеклянная, как в iOS 26.
 * `dark` (по умолчанию) — тёмное стекло с белым глифом: читается на любом кадре. */
export function NavRoundButton({
  icon, onPress, scheme = 'dark', accessibilityLabel,
}: { icon: string; onPress?: () => void; scheme?: 'light' | 'dark'; accessibilityLabel: string }) {
  return <GlassButton icon={icon} onPress={onPress} scheme={scheme} label={accessibilityLabel} />;
}
