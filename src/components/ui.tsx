// Shared iOS-style UI atoms — theme-aware via useTheme().
import React, { useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, Animated, StyleProp, ViewStyle } from 'react-native';
import { T as LIGHT, ty, radius, space, shadows } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { hTap, hSelect } from '../lib/haptics';
import { SF, SFName } from './SFIcon';

export function ProgressBar({
  value = 0.5, color, height = 4, track,
}: { value?: number; color?: string; height?: number; track?: string }) {
  const { T } = useTheme();
  const fill = color ?? T.brand;
  const bg = track ?? T.fillTertiary;
  return (
    <View style={{ height, backgroundColor: bg, borderRadius: height, overflow: 'hidden' }}>
      <View style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%`, height: '100%', backgroundColor: fill, borderRadius: height }} />
    </View>
  );
}

export function Capsule({
  children, bg, color, style,
}: { children: React.ReactNode; bg?: string; color?: string; style?: StyleProp<ViewStyle> }) {
  const { T } = useTheme();
  const _bg = bg ?? T.fillTertiary;
  const _color = color ?? T.label;
  return (
    <View style={[{
      flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
      paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: _bg,
    }, style]}>
      {(typeof children === 'string' || typeof children === 'number')
        ? <Text style={[ty.caption2Em, { color: _color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{children}</Text>
        : <CapsuleContent color={_color}>{children}</CapsuleContent>}
    </View>
  );
}

function CapsuleContent({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {React.Children.map(children, (c) =>
        (typeof c === 'string' || typeof c === 'number') ? <Text style={[ty.caption2Em, { color }]}>{c}</Text> : c)}
    </View>
  );
}

export function IconCircle({
  icon, color, bg, size = 30, iconSize,
}: { icon: SFName | string; color?: string; bg?: string; size?: number; iconSize?: number }) {
  const { T } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
      <SF name={icon} size={iconSize ?? Math.round(size * 0.55)} color={color ?? T.brand} />
    </View>
  );
}

export function IconSquircle({
  icon, color = '#fff', bg, size = 30, iconSize,
}: { icon: SFName | string; color?: string; bg?: string; size?: number; iconSize?: number }) {
  const { T } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.22, backgroundColor: bg ?? T.brand, alignItems: 'center', justifyContent: 'center' }}>
      <SF name={icon} size={iconSize ?? Math.round(size * 0.6)} color={color} />
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { T } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8, minHeight: 28 }}>
      <Text style={[ty.title3, { color: T.label, flexShrink: 1 }]} numberOfLines={1}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction ? () => { hSelect(); onAction(); } : undefined} hitSlop={8} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 2, opacity: pressed ? 0.5 : 1 })}>
          <Text style={[ty.subheadEm, { color: T.brandAccent }]}>{action}</Text>
          <SF name="chevron.forward" size={12} color={T.brandAccent} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function ListSection({
  header, footer, children, style,
}: { header?: string; footer?: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { T } = useTheme();
  return (
    <View style={[{ marginTop: 6 }, style]}>
      {header ? (
        <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 36, paddingTop: 8, paddingBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }]}>{header}</Text>
      ) : null}
      <View style={{ backgroundColor: T.cardBg, borderRadius: 10, marginHorizontal: 16, overflow: 'hidden' }}>
        {children}
      </View>
      {footer ? (
        <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 36, paddingTop: 6 }]}>{footer}</Text>
      ) : null}
    </View>
  );
}

export function ListRow({
  leading, title, subtitle, detail, trailing, chevron, last, onPress, valueColor,
}: {
  leading?: React.ReactNode; title?: string; subtitle?: string; detail?: string;
  trailing?: React.ReactNode; chevron?: boolean; last?: boolean; onPress?: () => void; valueColor?: string;
}) {
  const { T } = useTheme();
  const rowStyle: ViewStyle = {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16,
    minHeight: 44, position: 'relative',
  };
  const inner = (
    <>
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        {title ? <Text style={[ty.body, { color: T.label, flexShrink: 1 }]} numberOfLines={1}>{title}</Text> : null}
        {subtitle ? <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 1 }]}>{subtitle}</Text> : null}
      </View>
      {detail ? <Text style={[ty.body, { color: valueColor ?? T.labelSecondary }]}>{detail}</Text> : null}
      {trailing}
      {chevron ? <SF name="chevron.forward" size={14} color={T.labelTertiary} /> : null}
      {!last ? (
        <View style={{ position: 'absolute', bottom: 0, right: 0, left: leading ? 60 : 16, height: 0.5, backgroundColor: T.separator }} />
      ) : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [rowStyle, { opacity: pressed ? 0.6 : 1 }]}>
        {inner}
      </Pressable>
    );
  }
  return <View style={rowStyle}>{inner}</View>;
}

export function Separator({ left = 16 }: { left?: number }) {
  const { T } = useTheme();
  return <View style={{ position: 'absolute', bottom: 0, left, right: 0, height: 0.5, backgroundColor: T.separator }} />;
}

export function Segmented({
  items, value, onChange, leadingIcons,
}: { items: string[]; value: number; onChange?: (i: number) => void; leadingIcons?: (SFName | string)[] }) {
  const { T } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: T.fillTertiary, borderRadius: 9, padding: 2, height: 32 }}>
      {items.map((s, i) => {
        const on = i === value;
        return (
          <Pressable key={i} onPress={() => { hSelect(); onChange?.(i); }} accessibilityRole="button" style={{
            flex: 1, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center',
            backgroundColor: on ? T.systemBg : 'transparent', borderRadius: 7,
            ...(on ? { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null),
          }}>
            {leadingIcons ? <SF name={leadingIcons[i]} size={12} color={T.label} /> : null}
            <Text style={[ty.footnoteEm, { color: T.label }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{s}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({
  label, active, icon, onPress,
}: { label: string; active?: boolean; icon?: SFName | string; onPress?: () => void }) {
  const { T } = useTheme();
  return (
    <Pressable onPress={onPress ? () => { hSelect(); onPress(); } : undefined} accessibilityRole="button" accessibilityState={{ selected: active }} style={({ pressed }) => [{
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingVertical: 7, paddingHorizontal: 14, borderRadius: 18,
      backgroundColor: active ? T.brand : T.cardBg,
      borderWidth: 0.5, borderColor: active ? 'transparent' : T.separator,
      transform: [{ scale: pressed ? 0.96 : 1 }],
    }, active ? { shadowColor: T.brand, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 } : null]}>
      {icon ? <SF name={icon} size={11} color={active ? '#fff' : T.brand} /> : null}
      <Text style={[ty.footnoteEm, { color: active ? '#fff' : T.label }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Text>
    </Pressable>
  );
}

export function PrimaryButton({
  label, icon, onPress, color, textColor, style, loading, disabled,
}: { label: string; icon?: SFName | string; onPress?: () => void; color?: string; textColor?: string; style?: StyleProp<ViewStyle>; loading?: boolean; disabled?: boolean }) {
  const { T } = useTheme();
  const _color = color ?? T.brand;
  const fg = textColor ?? (_color === 'transparent' ? T.brand : '#fff');
  const solid = _color !== 'transparent';
  // Soft, brand-tinted elevation gives the solid CTA tactile depth (HIG).
  const shadow = solid ? {
    shadowColor: _color, shadowOpacity: 0.22, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  } : null;
  return (
    <Pressable onPress={onPress ? () => { hTap(); onPress(); } : undefined} disabled={disabled || loading} accessibilityRole="button" accessibilityState={{ disabled: disabled || loading, busy: loading }} style={({ pressed }) => [{
      height: 50, borderRadius: 14, backgroundColor: _color, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'center', gap: 8,
      transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.92 : disabled ? 0.45 : 1,
    }, shadow, style]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <SF name={icon} size={16} color={fg} /> : null}
          <Text style={[ty.headline, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

// Rounded surface used to group content. Optional soft elevation + press state.
export function Card({
  children, onPress, padded = true, elevated = false, style,
}: { children: React.ReactNode; onPress?: () => void; padded?: boolean; elevated?: boolean; style?: StyleProp<ViewStyle> }) {
  const { T } = useTheme();
  const base: ViewStyle = {
    backgroundColor: T.cardBg, borderRadius: radius.lg, overflow: 'hidden',
    ...(padded ? { padding: space.lg } : null),
    ...(elevated ? shadows.card : { borderWidth: 0.5, borderColor: T.cardBorder }),
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

// Tinted / outline companion to PrimaryButton for lower-emphasis actions.
export function SecondaryButton({
  label, icon, onPress, color, tinted = true, style, loading, disabled,
}: { label: string; icon?: SFName | string; onPress?: () => void; color?: string; tinted?: boolean; style?: StyleProp<ViewStyle>; loading?: boolean; disabled?: boolean }) {
  const { T } = useTheme();
  const accent = color ?? T.brand;
  return (
    <Pressable onPress={onPress ? () => { hTap(); onPress(); } : undefined} disabled={disabled || loading} accessibilityRole="button" accessibilityState={{ disabled: disabled || loading, busy: loading }} style={({ pressed }) => [{
      height: 50, borderRadius: radius.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: tinted ? T.brandTinted : 'transparent',
      borderWidth: tinted ? 0 : 1, borderColor: accent,
      transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.9 : disabled ? 0.45 : 1,
    }, style]}>
      {loading ? (
        <ActivityIndicator color={accent} />
      ) : (
        <>
          {icon ? <SF name={icon} size={16} color={accent} /> : null}
          <Text style={[ty.headline, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export { LIGHT as T, ty };
