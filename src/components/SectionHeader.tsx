import React from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch } from '../theme/tokens';
import { hSelect } from '../lib/haptics';
import { SF } from './SFIcon';

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { T, ty, textScale = 1 } = useTheme();
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale * textScale > 1.3;
  return (
    <View style={{ flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'flex-start' : 'center', gap: 8, justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8, minHeight: 28 }}>
      <Text accessibilityRole="header" style={[ty.title3, { color: T.label, flexShrink: 1 }]}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction ? () => { hSelect(); onAction(); } : undefined} accessibilityRole="button" accessibilityLabel={action}
          style={({ pressed }) => ({ minWidth: minTouch, minHeight: minTouch, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, opacity: pressed ? 0.5 : 1 })}>
          <Text style={[ty.subheadEm, { color: T.brandText }]}>{action}</Text>
          <SF name="chevron.forward" size={12} color={T.brandText} />
        </Pressable>
      ) : null}
    </View>
  );
}
