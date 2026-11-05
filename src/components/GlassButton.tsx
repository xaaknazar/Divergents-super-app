// Стеклянные кнопки как в панелях iOS 26 (Liquid Glass):
//  • GlassButton — отдельный круг: «закрыть», «назад», одно действие;
//  • GlassGroup — капсула, в которой рядом стоят связанные действия («отменить / вернуть»,
//    «разметка / поделиться»): одно стекло на группу, а не круг на каждую иконку;
//  • prominent — подтверждение («Готово ✓»): в тёмной теме светлое стекло с тёмным глифом,
//    в светлой — стекло цвета бренда с белым.
// Глифы монохромные; недоступное действие — серый глиф на том же стекле, а не бледная кнопка.
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { hSelect } from '../lib/haptics';
import { useTheme } from '../theme/ThemeContext';
import { useWashGlass } from './ColorWash';
import { minTouch } from '../theme/tokens';
import { GlassSurface } from './GlassSurface';
import { SF } from './SFIcon';

type Scheme = 'light' | 'dark';

function useGlyph(scheme: Scheme | undefined, prominent: boolean, danger: boolean, disabled: boolean) {
  const { T, isDark } = useTheme();
  const dark = scheme ? scheme === 'dark' : isDark;
  if (disabled) return dark ? 'rgba(255,255,255,0.32)' : 'rgba(60,60,67,0.3)';
  if (prominent) return isDark && !scheme ? '#1C1C1E' : '#FFFFFF';
  if (danger) return T.redText;
  // Светлое стекло поверх фото (scheme="light") светлое и в тёмной теме — глиф на нём всегда тёмный.
  if (scheme === 'light') return '#1C1C1E';
  return dark ? '#FFFFFF' : T.label;
}

export function GlassButton({ icon, onPress, onLongPress, label, prominent = false, danger = false, scheme, badge, size = minTouch, onWash = false }: {
  icon: string; onPress?: () => void; onLongPress?: () => void;
  /** Подпись для VoiceOver: у иконки нет текста. */
  label: string;
  prominent?: boolean;
  /** Удаляющее действие: красный глиф на обычном стекле. */
  danger?: boolean;
  /** Поверх фото или цветной шапки. По умолчанию — тема приложения. */
  scheme?: Scheme;
  badge?: number;
  size?: number;
  /** Кнопка лежит на цветном фоне (ColorWash): стекло берёт его оттенок, глиф белый. */
  onWash?: boolean;
}) {
  const { T, ty, isDark } = useTheme();
  const washGlass = useWashGlass();
  const tint = onWash ? washGlass ?? undefined : undefined;
  const baseGlyph = useGlyph(scheme, prominent, danger, !onPress);
  const glyph = tint && !prominent && !danger ? '#FFFFFF' : baseGlyph;
  const prominentTint = isDark && !scheme ? 'rgba(235,235,240,0.94)' : T.brand;
  return <Pressable onPress={onPress ? () => { hSelect(); onPress(); } : undefined} onLongPress={onLongPress} disabled={!onPress}
    accessibilityRole="button" accessibilityLabel={badge ? `${label}. ${badge}` : label} accessibilityState={{ disabled: !onPress }}
    hitSlop={Math.max(0, (minTouch - size) / 2)}
    style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }], opacity: pressed ? 0.85 : 1 })}>
    <GlassSurface interactive tint={prominent ? prominentTint : tint} scheme={scheme} style={{ width: size, height: size, borderRadius: size / 2 }}>
      <SF name={icon} size={Math.round(size * 0.48)} color={glyph} />
    </GlassSurface>
    {badge ? <View style={{ position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: T.brand,
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: T.groupedBg }}>
      <Text allowFontScaling={false} style={[ty.caption2Em, { color: T.onBrand }]}>{badge > 99 ? '99+' : badge}</Text>
    </View> : null}
  </Pressable>;
}

export interface GlassGroupItem { icon: string; label: string; onPress?: () => void; danger?: boolean }

/** Несколько связанных действий в одной стеклянной капсуле. Каждая иконка — своя кнопка 44×44. */
export function GlassGroup({ items, scheme, size = minTouch }: { items: GlassGroupItem[]; scheme?: Scheme; size?: number }) {
  return <GlassSurface interactive scheme={scheme} style={{ height: size, borderRadius: size / 2, flexDirection: 'row', paddingHorizontal: 4 }}>
    {items.map(item => <GroupSlot key={item.label} item={item} scheme={scheme} size={size} />)}
  </GlassSurface>;
}
function GroupSlot({ item, scheme, size }: { item: GlassGroupItem; scheme?: Scheme; size: number }) {
  const glyph = useGlyph(scheme, false, !!item.danger, !item.onPress);
  return <Pressable onPress={item.onPress ? () => { hSelect(); item.onPress?.(); } : undefined} disabled={!item.onPress}
    accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ disabled: !item.onPress }}
    style={({ pressed }) => ({ width: size + 4, height: size, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.55 : 1 })}>
    <SF name={item.icon} size={Math.round(size * 0.48)} color={glyph} />
  </Pressable>;
}
