import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { StatusBadge } from './StatusBadge';
import { Wrapper } from './Wrapper';

export interface CareerComingSoonProps { badge: string; title: string; description: string }
export function CareerComingSoon({ badge, title, description }: CareerComingSoonProps) {
  const { T, ty } = useTheme();
  return <Wrapper align="center">
    <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[styles.symbol, { shadowColor: T.brand }]}>
      <SF name="briefcase.fill" size={46} color="#FFFFFF" />
    </LinearGradient>
    <Wrapper marginTop={18}><StatusBadge tone="brand" label={badge} icon="clock.fill" /></Wrapper>
    <Text accessibilityRole="header" style={[ty.title2, styles.title, { color: T.label }]}>{title}</Text>
    <Text style={[ty.body, styles.description, { color: T.labelSecondary }]}>{description}</Text>
  </Wrapper>;
}
const styles = StyleSheet.create({
  symbol: { width: 100, height: 100, borderRadius: 30, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  title: { marginTop: 14, textAlign: 'center' },
  description: { marginTop: 10, textAlign: 'center' },
});
