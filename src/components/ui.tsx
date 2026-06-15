// Shared iOS-style UI atoms ported from the design prototype.
import React from 'react';
import { View, Text, Pressable, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { T, ty } from '../theme/tokens';
import { SF, SFName } from './SFIcon';

export function ProgressBar({
  value = 0.5, color = T.brand, height = 4, track = T.fillTertiary,
}: { value?: number; color?: string; height?: number; track?: string }) {
  return (
    <View style={{ height, backgroundColor: track, borderRadius: height, overflow: 'hidden' }}>
      <View style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%`, height: '100%', backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

export function Capsule({
  children, bg = T.fillTertiary, color = T.label, style,
}: { children: React.ReactNode; bg?: string; color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{
      flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
      paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: bg,
    }, style]}>
      {typeof children === 'string'
        ? <Text style={[ty.caption2Em, { color }]}>{children}</Text>
        : <CapsuleContent color={color}>{children}</CapsuleContent>}
    </View>
  );
}

function CapsuleContent({ children, color }: { children: React.ReactNode; color: string }) {
  // Group consecutive string/number children into a single <Text> (so numbers
  // never render bare — which crashes RN), and keep element children (icons) as-is.
  const out: React.ReactNode[] = [];
  let buf: string[] = [];
  let k = 0;
  const flush = () => {
    if (buf.length) {
      out.push(<Text key={`t${k++}`} style={[ty.caption2Em, { color }]}>{buf.join('')}</Text>);
      buf = [];
    }
  };
  React.Children.toArray(children).forEach((c) => {
    if (typeof c === 'string' || typeof c === 'number') buf.push(String(c));
    else { flush(); out.push(<React.Fragment key={`e${k++}`}>{c}</React.Fragment>); }
  });
  flush();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>{out}</View>;
}

export function IconCircle({
  icon, color = T.brand, bg = T.brandTinted, size = 30, iconSize,
}: { icon: SFName | string; color?: string; bg?: string; size?: number; iconSize?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <SF name={icon} size={iconSize ?? Math.round(size * 0.55)} color={color} />
    </View>
  );
}

export function IconSquircle({
  icon, color = '#fff', bg = T.brand, size = 30, iconSize,
}: { icon: SFName | string; color?: string; bg?: string; size?: number; iconSize?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.22, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <SF name={icon} size={iconSize ?? Math.round(size * 0.6)} color={color} />
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
        <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: T.brand }} />
        <Text style={[ty.title3, { color: T.label }]} numberOfLines={1}>{title}</Text>
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}><Text style={[ty.subheadEm, { color: T.brandAccent }]}>{action}</Text></Pressable>
      ) : null}
    </View>
  );
}

export function ListSection({
  header, footer, children, style,
}: { header?: string; footer?: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
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
  const rowStyle: ViewStyle = {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16,
    minHeight: 44, position: 'relative',
  };
  const inner = (
    <>
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        {title ? <Text style={[ty.body, { color: T.label }]}>{title}</Text> : null}
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

// Inline separator helper
export function Separator({ left = 16 }: { left?: number }) {
  return <View style={{ position: 'absolute', bottom: 0, left, right: 0, height: 0.5, backgroundColor: T.separator }} />;
}

// Segmented control (iOS style)
export function Segmented({
  items, value, onChange, leadingIcons,
}: { items: string[]; value: number; onChange?: (i: number) => void; leadingIcons?: (SFName | string)[] }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: T.fillTertiary, borderRadius: 9, padding: 2, height: 32 }}>
      {items.map((s, i) => {
        const on = i === value;
        return (
          <Pressable key={i} onPress={() => onChange?.(i)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={s} style={{
            flex: 1, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center',
            backgroundColor: on ? T.systemBg : 'transparent', borderRadius: 7,
            ...(on ? { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null),
          }}>
            {leadingIcons ? <SF name={leadingIcons[i]} size={12} color={T.label} /> : null}
            <Text style={[ty.footnoteEm, { color: T.label }]}>{s}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Chip / filter pill
export function Chip({
  label, active, icon, onPress,
}: { label: string; active?: boolean; icon?: SFName | string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!active }} accessibilityLabel={label} style={{
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingVertical: 7, paddingHorizontal: 14, borderRadius: 18,
      backgroundColor: active ? T.brand : T.cardBg,
      borderWidth: active ? 0 : 0.5, borderColor: T.separator,
    }}>
      {icon ? <SF name={icon} size={11} color={active ? '#fff' : T.brand} /> : null}
      <Text style={[ty.footnoteEm, { color: active ? '#fff' : T.label }]}>{label}</Text>
    </Pressable>
  );
}

// Primary CTA button
export function PrimaryButton({
  label, icon, onPress, color = T.brand, textColor, style,
}: { label: string; icon?: SFName | string; onPress?: () => void; color?: string; textColor?: string; style?: StyleProp<ViewStyle> }) {
  const fg = textColor ?? (color === 'transparent' ? T.brand : '#fff');
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [{
      height: 50, borderRadius: 14, backgroundColor: color, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.85 : 1,
    }, style]}>
      {icon ? <SF name={icon} size={16} color={fg} /> : null}
      <Text style={[ty.headline, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export { T, ty };
