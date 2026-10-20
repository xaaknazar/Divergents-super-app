import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { IconBadge } from './IconBadge';
import { Button } from './Button';
import { Wrapper } from './Wrapper';

export interface EmptyStateProps {
  icon?: string; title: string; subtitle?: string; actionLabel?: string; onAction?: () => void;
}
export function EmptyState({ icon = 'tray', title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const { T, ty } = useTheme();
  return <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 12 }}>
    <IconBadge icon={icon} tone="neutral" variant="halo" />
    <Text accessibilityRole="header" style={[ty.headline, { color: T.label, textAlign: 'center', marginTop: 6 }]}>{title}</Text>
    {subtitle ? <Text style={[ty.body, { color: T.labelSecondary, textAlign: 'center' }]}>{subtitle}</Text> : null}
    {actionLabel && onAction ? (
      <Wrapper marginTop={14} alignSelf="center"><Button label={actionLabel} onPress={onAction} size="comfortable" /></Wrapper>
    ) : null}
  </View>;
}
