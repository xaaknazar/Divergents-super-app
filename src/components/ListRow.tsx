import React from 'react';
import { Pressable,Text,View,ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch } from '../theme/tokens';
import { SF } from './SFIcon';

export function ListRow({
  leading, title, subtitle, detail, trailing, chevron, onPress, detailTone,
}: {
  leading?: React.ReactNode; title?: string; subtitle?: string; detail?: string;
  trailing?: React.ReactNode; chevron?: boolean; onPress?: () => void; detailTone?: 'secondary' | 'brand' | 'danger';
}) {
  const { T, ty } = useTheme();
  const rowStyle: ViewStyle = {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16,
    minHeight: minTouch, position: 'relative',
  };
  const inner = (
    <>
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* Wrap to a second line instead of truncating: long RU titles ("Написать
            в поддержку") must stay readable at every text size. */}
        {title ? <Text style={[ty.body, { color: T.label, flexShrink: 1 }]}>{title}</Text> : null}
        {subtitle ? <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 1 }]}>{subtitle}</Text> : null}
      </View>
      {detail ? <Text style={[ty.body, { color: detailTone === 'brand' ? T.brandText : detailTone === 'danger' ? T.redText : T.labelSecondary, flexShrink: 1, maxWidth: '38%', textAlign: 'right' }]}>{detail}</Text> : null}
      {trailing}
      {chevron ? <SF name="chevron.forward" size={14} color={T.labelTertiary} /> : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button"
        // Announce the whole row (title, subtitle, value), not just the title.
        accessibilityLabel={[title, subtitle, detail].filter(Boolean).join(', ') || undefined}
        style={({ pressed }) => [rowStyle, { opacity: pressed ? 0.6 : 1 }]}>
        {inner}
      </Pressable>
    );
  }
  return <View style={rowStyle}>{inner}</View>;
}
