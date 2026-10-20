import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';

export function InlineNotice({ message, onRetry, actionLabel = 'Повторить' }: { message: string; onRetry?: () => void; actionLabel?: string }) {
  const { T, ty } = useTheme();
  return <View accessibilityLiveRegion="polite" style={{ gap: 10 }}>
    <Text accessibilityRole={onRetry ? 'alert' : undefined} style={[ty.subhead, { color: T.labelSecondary }]}>{message}</Text>
    {onRetry ? <Button label={actionLabel} onPress={onRetry} variant="tinted" /> : null}
  </View>;
}
