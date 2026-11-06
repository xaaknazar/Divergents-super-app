// Стеклянные кнопки как в панелях iOS 26 (Liquid Glass):
//  • GlassButton — отдельный круг: «закрыть», «назад», одно действие;
//  • GlassGroup — капсула, в которой рядом стоят связанные действия («отменить / вернуть»,
//    «разметка / поделиться»): одно стекло на группу, а не круг на каждую иконку;
// Символы белые в обеих темах; стекло преломляет реальный фон, тонкий локальный контур сохраняет контраст символов.
// Недоступность обозначается приглушённым символом и accessibilityState.
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { hSelect } from '../lib/haptics';
import { useTheme } from '../theme/ThemeContext';
import { useColorWash } from './ColorWash';
import { lightTheme, minTouch } from '../theme/tokens';
import { GlassSurface } from './GlassSurface';
import { SF } from './SFIcon';

type Scheme = 'light' | 'dark';

// Navigation symbols keep the same white foreground in both app appearances.
const glyphColor = (disabled: boolean) => disabled ? 'rgba(255,255,255,0.45)' : '#FFFFFF';

export function GlassButton({ icon, onPress, onLongPress, label, prominent = false, danger = false, scheme, badge, size = minTouch, onWash = false }: {
  icon: string; onPress?: () => void; onLongPress?: () => void;
  /** Подпись для VoiceOver: у иконки нет текста. */
  label: string;
  prominent?: boolean;
  /** Удаляющее действие: красная кромка стекла с белым символом. */
  danger?: boolean;
  /** Поверх фото или цветной шапки. По умолчанию — тема приложения. */
  scheme?: Scheme;
  badge?: number;
  size?: number;
  /** На цветном фоне (ColorWash) размытие чуть мягче; символ остаётся белым. */
  onWash?: boolean;
}) {
  const { T, ty } = useTheme();
  const glyph = glyphColor(!onPress);
  const wash = useColorWash();
  return <Pressable onPress={onPress ? () => { hSelect(); onPress(); } : undefined} onLongPress={onLongPress} disabled={!onPress}
    accessibilityRole="button" accessibilityLabel={badge ? `${label}. ${badge}` : label} accessibilityState={{ disabled: !onPress }}
    hitSlop={Math.max(0, (minTouch - size) / 2)}
    style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }], opacity: pressed ? 0.85 : 1 })}>
    <GlassSurface interactive variant="navigation" emphasis={prominent ? 'strong' : onWash && wash ? 'subtle' : 'standard'} tone={danger ? 'danger' : 'default'} scheme={scheme} style={{ width: size, height: size, borderRadius: size / 2 }}>
      <SF name={icon} size={Math.round(size * 0.48)} color={glyph} contrast={onPress ? 'onGlass' : 'onGlassMuted'} />
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
  return <GlassSurface interactive variant="navigation" scheme={scheme} style={{ height: size, borderRadius: size / 2, flexDirection: 'row', paddingHorizontal: 4 }}>
    {items.map(item => <GroupSlot key={item.label} item={item} size={size} />)}
  </GlassSurface>;
}
function GroupSlot({ item, size }: { item: GlassGroupItem; size: number }) {
  const glyph = glyphColor(!item.onPress);
  return <Pressable onPress={item.onPress ? () => { hSelect(); item.onPress?.(); } : undefined} disabled={!item.onPress}
    accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ disabled: !item.onPress }}
    style={({ pressed }) => ({ width: size + 4, height: size, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.55 : 1 })}>
    <View style={{ width: size - 8, height: size - 8, borderRadius: (size - 8) / 2, alignItems: 'center', justifyContent: 'center', borderWidth: item.danger ? 1 : 0, borderColor: lightTheme.redText }}>
      <SF name={item.icon} size={Math.round(size * 0.48)} color={glyph} contrast={item.onPress ? 'onGlass' : 'onGlassMuted'} />
    </View>
  </Pressable>;
}
