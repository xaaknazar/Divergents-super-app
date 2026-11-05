import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
export function ReadingPagesStepButton({ direction, disabled, onPress }: {
  direction: 'less' | 'more'; disabled: boolean; onPress: () => void;
}) {
  const { T } = useTheme();
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
    accessibilityLabel={direction === 'less' ? 'Меньше страниц' : 'Больше страниц'} accessibilityState={{ disabled }}
    style={({ pressed }) => [styles.button, { backgroundColor: T.brandTinted, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}>
    <SF name={direction === 'less' ? 'minus' : 'plus'} size={22} color={T.brandText} />
  </Pressable>;
}
const styles = StyleSheet.create({ button: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' } });
