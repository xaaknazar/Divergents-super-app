import React from 'react';
import { GlassButton } from './GlassButton';

/**
 * Иконка в шапке экрана (меню, поделиться, закрыть). С ноября 2026 — круглая стеклянная кнопка,
 * как в iOS 26 (Liquid Glass); `primary` — главное действие на стекле цвета бренда.
 * `floating` оставлен для совместимости и выглядит так же, как обычная.
 */
export function HeaderIcon({ name, onPress, onLongPress, badge, label, variant = 'plain' }: {
  name: string; onPress?: () => void; onLongPress?: () => void; badge?: number; label: string;
  variant?: 'plain' | 'floating' | 'primary';
}) {
  return <GlassButton icon={name} onPress={onPress} onLongPress={onLongPress} badge={badge} label={label} prominent={variant === 'primary'} />;
}
