import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { IconBadge } from './IconBadge';
import { Button } from './Button';
import { Wrapper } from './Wrapper';

export interface ErrorStateProps { message?: string; onRetry?: () => void }
export function ErrorState({ message = 'Не удалось загрузить данные. Проверьте подключение к интернету.', onRetry }: ErrorStateProps) {
  const { T, ty } = useTheme();
  return <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 12 }}>
    <IconBadge icon="exclamationmark.bubble" tone="danger" variant="halo" />
    <Text accessibilityRole="header" style={[ty.headline, { color: T.label, textAlign: 'center', marginTop: 6 }]}>Не удалось загрузить</Text>
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[ty.body, { color: T.labelSecondary, textAlign: 'center' }]}>{message}</Text>
    {onRetry ? (
      <Wrapper marginTop={14} alignSelf="center"><Button label="Повторить" icon="arrow.clockwise" onPress={onRetry} size="comfortable" /></Wrapper>
    ) : null}
  </View>;
}
