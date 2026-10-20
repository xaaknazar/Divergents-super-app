import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, space } from '../theme/tokens';
import { hTap } from '../lib/haptics';
import { SF, SFName } from './SFIcon';

export interface ButtonProps {
  label: string;
  icon?: SFName | string;
  onPress?: () => void;
  variant?: 'solid' | 'tinted' | 'outline' | 'plain';
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'regular' | 'compact' | 'comfortable' | 'large';
  loading?: boolean;
  disabled?: boolean;
  selected?: boolean;
  expanded?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

/** Owns all appearance. Parent layout belongs to Wrapper, never this API. */
export function Button({ label, icon, onPress, variant = 'solid', tone = 'brand',
  size = 'regular', loading = false, disabled = false, selected, expanded, accessibilityHint, testID }: ButtonProps) {
  const { T, ty } = useTheme();
  const tones = {
    brand: { fill: T.brand, ink: T.brandText, onFill: T.onBrand, tinted: T.brandTinted },
    success: { fill: T.green, ink: T.greenText, onFill: T.onGreen, tinted: T.emeraldBadgeBg },
    warning: { fill: T.orange, ink: T.orangeText, onFill: T.onOrange, tinted: T.fillTertiary },
    danger: { fill: T.red, ink: T.redText, onFill: T.onRed, tinted: T.fillTertiary },
    neutral: { fill: T.labelTertiary, ink: T.labelSecondary, onFill: T.systemBg, tinted: T.fillTertiary },
  };
  const colors = tones[tone];
  const solid = variant === 'solid';
  const ink = solid ? colors.onFill : colors.ink;
  const blocked = disabled || loading;
  return (
    <Pressable testID={testID} onPress={onPress ? () => { hTap(); onPress(); } : undefined}
      disabled={blocked} accessibilityRole="button" accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: loading, selected, expanded }}
      style={({ pressed }) => [styles.base, styles[size], {
        backgroundColor: solid ? colors.fill : variant === 'tinted' ? colors.tinted : 'transparent',
        borderWidth: variant === 'outline' ? 1 : 0,
        borderColor: colors.ink,
        opacity: pressed ? 0.8 : disabled ? 0.45 : 1,
      }, solid && { shadowColor: colors.fill, shadowOpacity: 0.22, shadowRadius: 9,
        shadowOffset: { width: 0, height: 4 }, elevation: 3 }]}>
      {loading ? <ActivityIndicator color={ink} /> : icon ? <SF name={icon} size={16} color={ink} /> : null}
      <Text style={[ty.headline, styles.label, { color: ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 50, paddingVertical: space.md, paddingHorizontal: space.lg,
    borderRadius: radius.xl, borderCurve: 'continuous', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: space.sm },
  regular: {},
  compact: { minHeight: Platform.OS === 'android' ? 48 : 44, paddingVertical: space.sm },
  comfortable: { paddingHorizontal: 28 },
  large: { minHeight: 56, paddingHorizontal: 20 },
  label: { flexShrink: 1, textAlign: 'center' },
});
