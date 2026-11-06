import React from 'react';
import { GlassButton } from './GlassButton';

/**
 * Иконка в шапке экрана (меню, поделиться, закрыть). С ноября 2026 — круглая стеклянная кнопка,
 * как в iOS 26 (Liquid Glass); `primary` — главное действие с усиленной кромкой стекла.
 * `floating` оставлен для совместимости и выглядит так же, как обычная.
 */
export function HeaderIcon({ name, onPress, onLongPress, badge, label, variant = 'plain', danger, scheme, onWash }: {
  name: string; onPress?: () => void; onLongPress?: () => void; badge?: number; label: string;
  variant?: 'plain' | 'floating' | 'primary'; danger?: boolean;
  /** На цветной шапке или фото — 'dark'. */
  scheme?: 'light' | 'dark';
  /** Иконка лежит на цветном фоне (ColorWash): стекло преломляет этот фон без собственной цветной заливки. */
  onWash?: boolean;
}) {
  return <GlassButton icon={name} onPress={onPress} onLongPress={onLongPress} badge={badge} label={label} prominent={variant === 'primary'} danger={danger} scheme={scheme} onWash={onWash} />;
}
